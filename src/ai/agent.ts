import { StateGraph, START, END, Annotation, MemorySaver } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { prisma } from '../utils/prisma';

// 1. Define State
export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    locationRequested: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
    timeRequested: Annotation<Date>({
        reducer: (x, y) => y ?? x,
    }),
    durationRequested: Annotation<number>({
        reducer: (x, y) => y ?? x,
    }),
    serviceType: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
    recommendedBranches: Annotation<any[]>({
        reducer: (x, y) => y ?? x,
    }),
    missingInformation: Annotation<string[]>({
        reducer: (x, y) => y ?? x,
        default: () => ['location', 'time', 'duration'],
    }),
    isComplete: Annotation<boolean>({
        reducer: (x, y) => y ?? x,
        default: () => false,
    })
});

// Configure LLM
const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    // apiKey will be picked up from process.env.OPENAI_API_KEY
});

// NODE 1: conversation_manager
const conversationManager = async (state: typeof AgentState.State) => {
    // Use structured output to update state if they provided new info
    const extractionSchema = {
        title: 'BookingIntent',
        type: 'object',
        properties: {
            location: { type: 'string', description: 'The city the user wants to book in, e.g. Amman' },
            time: { type: 'string', description: 'ISO string of the time requested, e.g. 2026-03-05T10:00:00Z' },
            durationInHours: { type: 'number', description: 'How many hours they need the space for' },
            serviceType: { type: 'string', description: 'Hot Desk, Private Office, or Meeting Room' }
        }
    };

    const modelWithStructure = llm.withStructuredOutput(extractionSchema, { name: 'BookingIntent' });
    const result = await modelWithStructure.invoke(state.messages);

    const updates: Partial<typeof AgentState.State> = {};

    if (result.location) updates.locationRequested = result.location;
    if (result.time) updates.timeRequested = new Date(result.time);
    if (result.durationInHours) updates.durationRequested = result.durationInHours;
    if (result.serviceType) updates.serviceType = result.serviceType;

    return updates;
};

// NODE 2: check_requirements
const checkRequirements = (state: typeof AgentState.State) => {
    const missing = [];
    if (!state.locationRequested) missing.push('location');
    if (!state.timeRequested) missing.push('time');
    if (!state.durationRequested) missing.push('duration');

    if (missing.length > 0) {
        return { missingInformation: missing, isComplete: false };
    }
    return { missingInformation: [], isComplete: false };
};

// Conditional Edge Router
const routeAfterCheck = (state: typeof AgentState.State) => {
    if (state.missingInformation.length > 0) {
        return 'askHuman';
    }
    return 'searchDatabase';
};

// NODE 3: search_database
const searchDatabase = async (state: typeof AgentState.State) => {
    console.log('SEARCH_DB_QUERY:', { location: state.locationRequested, service: state.serviceType });

    // Execute a targeted Prisma query built dynamically from state
    const branches = await prisma.branch.findMany({
        where: {
            location: {
                contains: state.locationRequested || ''
            },
            status: 'ACTIVE'
        },
        include: {
            vendorServices: {
                where: state.serviceType ? {
                    service: {
                        name: {
                            contains: state.serviceType
                        }
                    }
                } : undefined,
                include: { service: true }
            },
            facilities: {
                include: {
                    facility: true
                }
            }
        }
    });

    const validBranches = branches.filter((b: any) => b.vendorServices.length > 0).map((b: any) => {
        return {
            id: b.id,
            name: b.name,
            location: b.location,
            facilities: b.facilities?.filter((f: any) => f.isAvailable).map((f: any) => f.facility.name)
        };
    });

    return { recommendedBranches: validBranches };
};

// NODE 4: generate_recommendation
const generateRecommendation = async (state: typeof AgentState.State) => {
    const systemPrompt = `You are a helpful booking AI for AT Spaces. 
  You have successfully found the following branches based on the user's request:
  ${JSON.stringify(state.recommendedBranches, null, 2)}
  Write a short, polite message presenting these options to the customer. Assure them they can select one to proceed.`;

    const response = await llm.invoke([
        { role: 'system', content: systemPrompt },
        ...state.messages
    ]);

    return {
        messages: [response],
        isComplete: true
    };
};

// NODE 5: ask_human
const askHuman = async (state: typeof AgentState.State) => {
    const prompt = `You are an AI booking assistant. You need the following information from the user before you can search for a space: ${state.missingInformation.join(', ')}.
  Ask the user for this missing information politely.`;

    const response = await llm.invoke([
        { role: 'system', content: prompt },
        ...state.messages
    ]);

    return { messages: [response] };
};

// Build the Graph
const workflow = new StateGraph(AgentState)
    .addNode('conversationManager', conversationManager)
    .addNode('checkRequirements', checkRequirements)
    .addNode('searchDatabase', searchDatabase)
    .addNode('generateRecommendation', generateRecommendation)
    .addNode('askHuman', askHuman)

    .addEdge(START, 'conversationManager')
    .addEdge('conversationManager', 'checkRequirements')
    .addConditionalEdges('checkRequirements', routeAfterCheck, {
        askHuman: 'askHuman',
        searchDatabase: 'searchDatabase'
    })
    .addEdge('searchDatabase', 'generateRecommendation')
    .addEdge('generateRecommendation', END)
    .addEdge('askHuman', END);

// Compile the graph with a memory checkpointer
const checkpointer = new MemorySaver();
export const ATSpacesBookingAgent = workflow.compile({ checkpointer });
