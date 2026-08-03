import mongoose, { Schema } from "mongoose";

export type ImageStatus = "ACTIVE" | "INACTIVE";
export type GameResult = "WIN" | "LOSE";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    customerType: { type: String, enum: ["retail", "agency"] },
    productOfInterest: { type: String, enum: ["move", "kingsport"] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const gameImageSchema = new Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    gridSize: { type: Number, default: 3 }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "game_images" }
);

const gameLevelSchema = new Schema(
  {
    name: { type: String, required: true },
    timeLimit: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    quickWinSeconds: { type: Number, required: true },
    scoreRules: [{ withinSeconds: Number, score: Number }]
  },
  { collection: "game_levels" }
);

const gameSettingsSchema = new Schema(
  {
    playMode: { type: String, enum: ["ONCE_PER_PHONE", "MULTIPLE"], default: "ONCE_PER_PHONE" },
    allowMultiplePlay: { type: Boolean, default: false },
    gameStatus: { type: Boolean, default: true },
    leaderboardEnabled: { type: Boolean, default: true },
    triggerName: { type: String, default: "Bot API Zalo ZBS" },
    triggerInterval: { type: Boolean, default: false },
    apiPostUrl: { type: String, default: "" },
    apiHeaders: { type: String, default: "" },
    apiBody: { type: String, default: "" },
    apiGetUrl: { type: String, default: "" }
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: "game_settings" }
);

const gameHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    levelId: { type: Schema.Types.ObjectId, ref: "GameLevel", required: true },
    result: { type: String, enum: ["WIN", "LOSE"], required: true },
    score: { type: Number, required: true },
    duration: { type: Number, required: true },
    moves: { type: Number, required: true },
    playedAt: { type: Date, default: Date.now }
  },
  { collection: "game_histories" }
);

export const User = mongoose.model("User", userSchema);
export const GameImage = mongoose.model("GameImage", gameImageSchema);
export const GameLevel = mongoose.model("GameLevel", gameLevelSchema);
export const GameSettings = mongoose.model("GameSettings", gameSettingsSchema);
export const GameHistory = mongoose.model("GameHistory", gameHistorySchema);
