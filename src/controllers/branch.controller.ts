import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getBranches = async (req: Request, res: Response): Promise<void> => {
    try {
        const { city, serviceType } = req.query;

        const whereClause: any = {
            status: 'ACTIVE' // Assuming we only want to show active branches to customers
        };

        if (city) {
            whereClause.location = city as any;
        }

        if (serviceType) {
            whereClause.vendorServices = {
                some: {
                    service: {
                        name: {
                            contains: serviceType as string
                        }
                    }
                }
            };
        }

        const branches = await prisma.branch.findMany({
            where: whereClause,
            include: {
                facilities: {
                    include: {
                        facility: true
                    }
                }
            }
        });

        const formattedBranches = branches.map((b: any) => ({
            id: b.id,
            name: b.name,
            city: b.location,
            address: b.accessMapUrl || 'Address details', // Mapped from accessMapUrl based on schema
            facilities: b.facilities?.filter((f: any) => f.isAvailable).map((f: any) => ({
                id: f.facility.id,
                name: f.facility.name,
                icon: f.facility.icon,
                description: f.description
            }))
        }));

        res.status(200).json(formattedBranches);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getBranchById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const branch = await prisma.branch.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                facilities: {
                    include: { facility: true }
                },
                vendorServices: {
                    include: {
                        service: true,
                        features: {
                            include: { feature: true }
                        }
                    }
                }
            }
        });

        if (!branch) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const formattedBranch = {
            id: branch.id,
            name: branch.name,
            description: `Branch located in ${String(branch.location)}`,
            facilities: branch.facilities?.filter((f: any) => f.isAvailable).map((f: any) => ({ // Renamed from branchFacilities
                name: f.facility.name,
                description: f.description
            })),
            services: branch.vendorServices?.map((vs: any) => ({
                serviceId: vs.serviceId,
                vendorServiceId: vs.id,
                name: vs.service.name,
                pricePerHour: vs.pricePerHour,
                pricePerDay: vs.pricePerDay,
                capacity: vs.capacity,
                features: vs.features?.map((sf: any) => ({ // Renamed from serviceFeatures
                    name: sf.feature.name,
                    quantity: sf.quantity
                }))
            }))
        };

        res.status(200).json(formattedBranch);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
