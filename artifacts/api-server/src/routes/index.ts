import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chordsRouter from "./chords";
import scoresRouter from "./scores";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chordsRouter);
router.use(scoresRouter);

export default router;
