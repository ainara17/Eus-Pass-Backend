import { Router } from "express";

const router = Router();


//enpoints
router.get("/health", (req, res) => {
    res.json({message: "Everything is fine"})
})



export default router