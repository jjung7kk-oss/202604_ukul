import { Router, type IRouter } from "express";
import { verifyCredentials, signSessionToken } from "../lib/adminAuth";

const router: IRouter = Router();

router.post("/auth/login", (req, res) => {
  const body = req.body as { username?: string; password?: string };
  const username = body.username;
  const password = body.password;
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username and password required" });
    return;
  }
  if (!verifyCredentials(username, password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json({ token: signSessionToken() });
});

export default router;
