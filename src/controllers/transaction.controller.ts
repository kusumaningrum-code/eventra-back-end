import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import cloudinary from "../config/cloudinary2";
import multer from "multer";
import ResponseHandler from "../utils/ResponseHandler";

export class TransactionController {
  async createTransaction(req: Request, res: Response): Promise<any> {
    try {
      const { ticketId, userId, promoCode, finalPrice } = req.body;
      const proofImage = req.file;

      if (!ticketId || !userId) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "ticketId, userId, and finalPrice are required",
        });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { ticket_id: Number(ticketId) },
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.available <= 0) {
        return res.status(400).json({ error: "Ticket is sold out" });
      }

      let imageUrl = "";
      if (proofImage) {
        try {
          console.log("File info:", {
            originalname: proofImage.originalname,
            mimetype: proofImage.mimetype,
            size: proofImage.size,
            hasBuffer: !!proofImage.buffer,
          });

          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "payment-proofs",
                resource_type: "auto",
                public_id: `proof_${userId}_${Date.now()}`,
                overwrite: true,
                transformation: [
                  { width: 1000, height: 1000, crop: "limit" },
                  { quality: "auto" },
                ],
              },
              (error, result) => {
                if (error) {
                  console.error("Cloudinary upload error:", error);
                  reject(error);
                } else {
                  console.log("Cloudinary upload success:", result?.secure_url);
                  resolve(result);
                }
              }
            );

            uploadStream.end(proofImage.buffer);
          });

          imageUrl = (uploadResult as any).secure_url;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          return res.status(500).json({
            error: "Failed to upload image to Cloudinary",
            details:
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown upload error",
          });
        }
      }

      const transaction = await prisma.transaction.create({
        data: {
          ticketId: Number(ticketId),
          userId: Number(userId),
          proofImage: imageUrl,
          finalPrice: Number(finalPrice),
          promotionCode: promoCode || null,
          status: "SUCCESS",
        },
      });

      await prisma.ticket.update({
        where: { ticket_id: Number(ticketId) },
        data: {
          available: {
            decrement: 1,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: transaction,
      });
    } catch (error) {
      console.error("Transaction error:", error);
      return res.status(500).json({
        error: "Failed to create transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getUserTransactions(req: Request, res: Response): Promise<any> {
    try {
      const userId = parseInt(req.params.userId);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userId,
        },
        include: {
          ticket: {
            include: {
              event: {
                select: {
                  name: true,
                  date: true,
                  time: true,
                  location: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      return res.status(500).json({
        error: "Failed to fetch transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  //stats
  async getOrganizerEventStats(req: Request, res: Response): Promise<any> {
    try {
      const organizerId = parseInt(req.params.organizerId);
      const events = await prisma.event.findMany({
        where: {
          organiserId: organizerId,
        },
        include: {
          tickets: {
            include: {
              transactions: {
                select: {
                  finalPrice: true,
                  createdAt: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      interface EventStats {
        eventId: number;
        eventName: string;
        eventDate: Date;
        ticketsSold: number;
        earnings: number;
      }

      const eventStats: EventStats[] = events.map((event) => {
        const totalTickets = event.tickets.reduce((sum: number, ticket) => {
          const soldTickets = ticket.transactions.filter(
            (t) => t.status === "SUCCESS"
          ).length;
          return sum + soldTickets;
        }, 0);

        const totalEarnings = event.tickets.reduce((sum: number, ticket) => {
          const successfulTransactions = ticket.transactions
            .filter((t) => t.status === "SUCCESS")
            .reduce(
              (transactionSum: number, t) => transactionSum + t.finalPrice,
              0
            );
          return sum + successfulTransactions;
        }, 0);

        return {
          eventId: event.event_id,
          eventName: event.name,
          eventDate: event.date,
          ticketsSold: totalTickets,
          earnings: totalEarnings,
        };
      });

      interface MonthlyStats {
        month: number;
        year: number;
        events: number;
        earnings: number;
        ticketsSold: number;
      }

      const monthlyStats = eventStats.reduce(
        (acc: Record<string, MonthlyStats>, event) => {
          const month = event.eventDate.getMonth();
          const year = event.eventDate.getFullYear();
          const key = `${year}-${month + 1}`;

          if (!acc[key]) {
            acc[key] = {
              month: month + 1,
              year,
              events: 0,
              earnings: 0,
              ticketsSold: 0,
            };
          }

          acc[key].events += 1;
          acc[key].earnings += event.earnings;
          acc[key].ticketsSold += event.ticketsSold;

          return acc;
        },
        {}
      );

      const overallStats = {
        totalEvents: events.length,
        totalTicketsSold: eventStats.reduce(
          (sum, event) => sum + event.ticketsSold,
          0
        ),
        totalEarnings: eventStats.reduce(
          (sum, event) => sum + event.earnings,
          0
        ),
      };

      return res.json({
        overallStats,
        monthlyBreakdown: Object.values(monthlyStats).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }),
        eventDetails: eventStats.sort(
          (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
        ),
      });
    } catch (error) {
      console.error("Error fetching organizer stats:", error);
      return res.status(500).json({
        error: "Failed to fetch organizer statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getTotalTransaction(req: Request, res: Response): Promise<any> {
    try {
      // dapetin user id nya
      const userId = parseInt(req.params.organiserId, 10);

      // mencari semua event yang dibuat oleh 1 user
      const events = await prisma.event.findMany({
        where: { organiserId: userId },
        include: {
          tickets: {
            include: {
              transactions: {
                select: {
                  finalPrice: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (events.length === 0) {
        return ResponseHandler.error(res, "No events found for this user", 400);
      }

      // ini ngitung total transaksi dari semua event yang ditemukan

      let totalTransaction = 0;
      events.forEach((event) => {
        event.tickets.forEach((ticket) => {
          ticket.transactions.forEach((transaction) => {
            if (transaction.status === "SUCCESS") {
              totalTransaction += transaction.finalPrice;
            }
          });
        });
      });

      return ResponseHandler.success(
        res,
        "Success get all Total",
        200,
        totalTransaction
      );
    } catch (error: any) {
      console.log(error);
      return ResponseHandler.error(
        res,
        "Failed to fetch total transaction",
        400
      );
    }
  }
}
