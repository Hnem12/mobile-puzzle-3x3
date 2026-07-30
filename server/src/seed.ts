import "dotenv/config";
import mongoose from "mongoose";
import { GameImage, GameLevel, GameSettings } from "./models.js";

const levels = [
  {
    name: "Easy",
    timeLimit: 90,
    quickWinSeconds: 45,
    maxScore: 2000,
    scoreRules: [
      { withinSeconds: 44, score: 2000 },
      { withinSeconds: 54, score: 1500 },
      { withinSeconds: 74, score: 1000 },
    ],
  },
];

await mongoose.connect(process.env.MONGO_URI as string);
await GameLevel.deleteMany({});
await GameLevel.insertMany(levels);
await GameSettings.deleteMany({});
await GameSettings.create({});
if (!(await GameImage.exists({}))) {
  await GameImage.create({
    name: "Move SECC Demo",
    imageUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    status: "ACTIVE",
    gridSize: 3,
  });
}
await mongoose.disconnect();
console.log("Seed completed");
