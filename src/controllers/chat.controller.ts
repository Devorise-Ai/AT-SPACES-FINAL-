import { Request, Response } from 'express';
import { ATSpacesBookingAgent } from '../ai/agent';
import { HumanMessage } from '@langchain/core/messages';

export const handleChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, threadId } = req.body;
        const userId = (req as any).user?.id || 'anonymous';

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        // threadId represents the conversation ID for restoring state
        const config = { configurable: { thread_id: threadId || `conv_${userId}_${Date.now()}` } };

        // Invoke the Langgraph Agent
        const result = await ATSpacesBookingAgent.invoke(
            { messages: [new HumanMessage(message)] },
            config
        );

        const currentState = result;

        // The agent logic will determine `isComplete`.
        // If true, it means it has populated `recommendedBranches` and we return them.
        res.status(200).json({
            threadId: config.configurable.thread_id,
            agentMessage: currentState.messages[currentState.messages.length - 1].content,
            isComplete: currentState.isComplete || false,
            recommendedBranches: currentState.isComplete ? currentState.recommendedBranches : undefined,
            missingInformation: currentState.missingInformation || []
        });
    } catch (error: any) {
        console.error('CHAT_ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};
