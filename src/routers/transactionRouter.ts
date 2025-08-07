import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { verifyToken } from "../middleware/verifyToken";
import { uploaderMemory } from "../middleware/uploader";

export class TransactionRouter {
  private route: Router;
  private transactionController: TransactionController;

  constructor() {
    this.route = Router();
    this.transactionController = new TransactionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.route.get(
      "/organizer/:organizerId/stats",
      this.transactionController.getOrganizerEventStats
    );

    this.route.post(
      "/",
      uploaderMemory().single("proofImage"),
      this.transactionController.createTransaction
    );
    this.route.get(
      "/user/:userId",
      this.transactionController.getUserTransactions
    );

    this.route.get(
      "/total-earnings/organizer/:organiserId",
      this.transactionController.getTotalTransaction
    );
  }

  public getRouter(): Router {
    return this.route;
  }
}
