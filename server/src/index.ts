import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { z } from "zod";
import { requireAdmin } from "./middleware.js";
import {
  GameHistory,
  GameImage,
  GameLevel,
  GameSettings,
  User,
} from "./models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4000);
const uploadDir = path.resolve(__dirname, "../uploads");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        (process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN === "*")
      ) {
        return callback(null, true);
      }
      const allowedOrigins = [
        "https://mobile-puzzle-3x3-production.up.railway.app",
        "http://localhost:5173",
        ...(process.env.CLIENT_ORIGIN
          ? process.env.CLIENT_ORIGIN.split(",")
          : []),
      ];
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Temporarily allow all for easier debugging during setup
      }
    },
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Puzzle Backend Running",
  });
});

// Middleware để tự động thêm Content-Type: application/json nếu người dùng quên truyền
app.use((req, res, next) => {
  if (
    !req.headers["content-type"] &&
    ["POST", "PUT", "PATCH"].includes(req.method)
  ) {
    req.headers["content-type"] = "application/json";
  }
  next();
});

app.use(express.json());

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (
    !process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.json({
    token: jwt.sign({ role: "admin" }, process.env.JWT_SECRET as string, {
      expiresIn: "8h",
    }),
  });
});

app.get("/api/admin/images", requireAdmin, async (_req, res) =>
  res.json(await GameImage.find().sort({ createdAt: -1 })),
);
app.post(
  "/api/admin/images",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "Image is required" });

    const b64 = req.file.buffer.toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const image = await GameImage.create({
      name: req.body.name || req.file.originalname,
      imageUrl: dataURI,
      gridSize: Number(req.body.gridSize || 3),
      status: "ACTIVE",
    });
    res.status(201).json(image);
  },
);
app.patch("/api/admin/images/:id/status", requireAdmin, async (req, res) => {
  const image = await GameImage.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true },
  );
  res.json(image);
});
app.delete("/api/admin/images/:id", requireAdmin, async (req, res) => {
  await GameImage.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.get("/api/admin/levels", requireAdmin, async (_req, res) =>
  res.json(await GameLevel.find().sort({ maxScore: 1 })),
);
app.post("/api/admin/levels", requireAdmin, async (req, res) => {
  res.status(201).json(await GameLevel.create(req.body));
});
app.put("/api/admin/levels/:id", requireAdmin, async (req, res) => {
  res.json(
    await GameLevel.findByIdAndUpdate(req.params.id, req.body, { new: true }),
  );
});
app.get("/api/admin/settings", requireAdmin, async (_req, res) =>
  res.json(await getSettings()),
);
app.put("/api/admin/settings", requireAdmin, async (req, res) => {
  const settings = await getSettings();
  Object.assign(settings, req.body, {
    allowMultiplePlay:
      req.body.playMode === "MULTIPLE" || req.body.allowMultiplePlay,
  });
  await settings.save();
  res.json(settings);
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const filter = q
    ? {
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }
    : {};
  res.json(await User.find(filter).sort({ createdAt: -1 }));
});

app.get("/api/admin/users/export", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const filter = q
    ? {
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }
    : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  const rows = users.map((u: any) => ({
    "Họ và tên": u.fullName,
    "Số điện thoại": u.phone,
    "Địa chỉ": u.address || "",
    "Loại KH":
      u.customerType === "agency" ? "Khách hàng đại lý" : "Khách hàng mua lẻ",
    "Sản phẩm quan tâm":
      u.productOfInterest === "kingsport" ? "Kingsport" : "Xe điện MOVE",
    "Ngày đăng ký": u.createdAt
      ? new Date(u.createdAt).toISOString().slice(0, 10)
      : "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Users");
  res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
  res.end(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
});

app.get("/api/admin/histories", requireAdmin, async (req, res) =>
  res.json(await queryHistories(req.query)),
);
app.get("/api/admin/histories/export", requireAdmin, async (req, res) => {
  const rows = await queryHistories(req.query);
  const sheet = XLSX.utils.json_to_sheet(rows.map(formatHistory));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Histories");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=game-histories.xlsx",
  );
  res.end(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
});
app.post("/api/admin/nocodb/export", requireAdmin, async (req, res) => {
  try {
    // 1. Lấy toàn bộ dữ liệu hiện có trên NocoDB và xóa
    try {
      const getRes = await fetch(
        "https://nocodb.smax.in/api/v2/tables/mvnjqxm4bfa4qtn/records?limit=1000",
        {
          headers: { "xc-token": "9XcWdwwaxAznbxKwmx-wcwQI81K9vC3JD7GtK0ot" },
        },
      );
      const oldData = await getRes.json();
      if (oldData && oldData.list && oldData.list.length > 0) {
        const recordsToDelete = oldData.list.map((r: any) => ({ Id: r.Id }));
        await fetch(
          "https://nocodb.smax.in/api/v2/tables/mvnjqxm4bfa4qtn/records",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "xc-token": "9XcWdwwaxAznbxKwmx-wcwQI81K9vC3JD7GtK0ot",
            },
            body: JSON.stringify(recordsToDelete),
          },
        );
        console.log(
          "Đã xóa",
          recordsToDelete.length,
          "bản ghi cũ trên NocoDB.",
        );
      }
    } catch (e) {
      console.error("Lỗi khi xóa data NocoDB cũ:", e);
    }

    const rows = await queryHistories({});
    rows.sort((a: any, b: any) => {
      const rankA = a.rank ?? Infinity;
      const rankB = b.rank ?? Infinity;
      return rankA - rankB;
    });

    let successCount = 0;
    for (const r of rows) {
      const user = r.userId || {};
      const nocodbData = {
        full_name: user.fullName || "",
        phone_number: user.phone || "",
        address: user.address || "",
        shopping_need: user.customerType === "agency" ? "đại lý" : "khách lẻ",
        interested_product:
          user.productOfInterest === "kingsport" ? "Kingsport" : "xe điện",
        result: r.result === "WIN" ? "Hoàn thành" : "Thất bại",
        rank: r.rank ? String(r.rank) : "",
        score: String(r.score || 0),
        completion_time: String(r.duration || 0),
        steps: String(r.moves || 0),
        played_at: new Date(r.playedAt || new Date()).toLocaleDateString(
          "en-GB",
        ),
      };

      await fetch(
        "https://nocodb.smax.in/api/v2/tables/mvnjqxm4bfa4qtn/records",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xc-token": "9XcWdwwaxAznbxKwmx-wcwQI81K9vC3JD7GtK0ot",
          },
          body: JSON.stringify(nocodbData),
        },
      );
      successCount++;
    }
    res.json({
      message: `Đã xóa dữ liệu cũ và xuất ${successCount} bản ghi sang NocoDB.`,
    });
  } catch (error) {
    console.error("Export NocoDB error:", error);
    res.status(500).json({ message: "Có lỗi khi xuất dữ liệu sang NocoDB." });
  }
});
app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
  const [totalPlays, wins, losses, users, scoreAgg, topPlayers] =
    await Promise.all([
      GameHistory.countDocuments(),
      GameHistory.countDocuments({ result: "WIN" }),
      GameHistory.countDocuments({ result: "LOSE" }),
      User.countDocuments(),
      GameHistory.aggregate([
        { $group: { _id: null, avg: { $avg: "$score" } } },
      ]),
      leaderboard(),
    ]);
  res.json({
    totalPlays,
    totalUsers: users,
    totalWins: wins,
    totalLosses: losses,
    averageScore: Math.round(scoreAgg[0]?.avg || 0),
    topPlayers,
  });
});

app.get("/api/game/bootstrap", async (_req, res) => {
  const [settings, levels, images] = await Promise.all([
    getSettings(),
    GameLevel.find().sort({ maxScore: 1 }),
    GameImage.find({ status: "ACTIVE", gridSize: 3 }).sort({
      createdAt: -1,
    }),
  ]);
  res.json({ settings, levels, images });
});
app.post("/api/game/register", async (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự"),
      phone: z.string().trim().min(8, "Số điện thoại không hợp lệ"),
      address: z.string().optional(),
      customerType: z.enum(["retail", "agency"]).optional(),
      productOfInterest: z.enum(["move", "kingsport"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ message: "Vui lòng nhập họ tên và số điện thoại hợp lệ" });

  const body = parsed.data;
  const settings = await getSettings();
  if (!settings.gameStatus)
    return res.status(403).json({ message: "Game is disabled" });
  const user = await User.findOneAndUpdate({ phone: body.phone }, body, {
    new: true,
    upsert: true,
  });
  if (
    !settings.allowMultiplePlay &&
    (await GameHistory.exists({ userId: user._id }))
  ) {
    return res
      .status(409)
      .json({ message: "Số điện thoại này đã tham gia trò chơi" });
  }
  res.json(user);
});
app.post("/api/game/histories", async (req, res) => {
  const parsed = z
    .object({
      userId: z.string(),
      levelId: z.string(),
      result: z.enum(["WIN", "LOSE"]),
      score: z.number(),
      duration: z.number(),
      moves: z.number(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Dữ liệu lượt chơi không hợp lệ" });

  const settings = await getSettings();
  if (
    !settings.allowMultiplePlay &&
    (await GameHistory.exists({ userId: parsed.data.userId }))
  ) {
    return res
      .status(409)
      .json({ message: "Tài khoản này đã ghi nhận kết quả trò chơi" });
  }

  const history = await GameHistory.create(parsed.data);
  res.status(201).json(history);

  // Trigger configured ZBS API
  (async () => {
    try {
      if (settings.apiPostUrl || settings.apiGetUrl) {
        const user = await User.findById(parsed.data.userId);
        if (user && user.phone) {
          let userRank = "--";
          if (parsed.data.result === "WIN") {
            const allWins = await GameHistory.find({ result: "WIN" })
              .sort({ duration: 1, score: -1, moves: 1 })
              .select("_id")
              .lean();
            const idx = allWins.findIndex(
              (w: any) => String(w._id) === String(history._id),
            );
            if (idx >= 0) userRank = String(idx + 1);
          }

          // Gửi data sang NocoDB
          try {
            const nocodbData = {
              full_name: user.fullName || "",
              phone_number: user.phone || "",
              address: user.address || "",
              shopping_need:
                user.customerType === "agency" ? "đại lý" : "khách lẻ",
              interested_product:
                user.productOfInterest === "kingsport"
                  ? "Kingsport"
                  : "xe điện",
              result: parsed.data.result === "WIN" ? "Hoàn thành" : "Thất bại",
              rank: userRank === "--" ? "" : userRank,
              score: String(parsed.data.score),
              completion_time: String(parsed.data.duration),
              steps: String(parsed.data.moves),
              played_at: new Date().toLocaleDateString("en-GB"),
            };

            await fetch(
              "https://nocodb.smax.in/api/v2/tables/mvnjqxm4bfa4qtn/records",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "xc-token": "9XcWdwwaxAznbxKwmx-wcwQI81K9vC3JD7GtK0ot",
                },
                body: JSON.stringify(nocodbData),
              },
            );
            console.log("Sync NocoDB success");
          } catch (e) {
            console.error("Sync NocoDB error:", e);
          }

          const replacePlaceholders = (str: string) => {
            return str
              .replace(/{{(phone|sdt)}}/g, user.phone)
              .replace(/{{name}}/g, user.fullName || "")
              .replace(/{{result}}/g, parsed.data.result)
              .replace(/{{score}}/g, String(parsed.data.score))
              .replace(/{{duration}}/g, String(parsed.data.duration))
              .replace(/{{moves}}/g, String(parsed.data.moves))
              .replace(/{{top}}/g, userRank);
          };

          if (settings.apiPostUrl) {
            let bodyStr = settings.apiBody || "";
            bodyStr = replacePlaceholders(bodyStr);
            let postUrl = replacePlaceholders(settings.apiPostUrl);

            let headersObj: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (settings.apiHeaders) {
              try {
                headersObj = {
                  ...headersObj,
                  ...JSON.parse(settings.apiHeaders),
                };
              } catch (e) {
                console.error("Error parsing API Headers:", e);
              }
            }

            const zbsRes = await fetch(postUrl, {
              method: "POST",
              headers: headersObj,
              body: bodyStr,
            });
            const textRes = await zbsRes.text();
            console.log("ZBS Trigger POST status:", zbsRes.status, textRes);
          } else if (settings.apiGetUrl) {
            let urlStr = replacePlaceholders(settings.apiGetUrl);

            // Encode the URL to handle spaces and raw JSON characters in the query
            // Ignore encoding if it somehow fails, but encodeURI is usually safe.
            let finalUrl = urlStr;
            try {
              finalUrl = encodeURI(urlStr);
            } catch (e) {}

            const zbsRes = await fetch(finalUrl, { method: "GET" });
            console.log(
              "ZBS Trigger GET status:",
              zbsRes.status,
              await zbsRes.text(),
            );
          }
        }
      }
    } catch (e) {
      console.error("ZBS API Trigger Error:", e);
    }
  })();
});
app.get("/api/game/leaderboard", async (req, res) =>
  res.json(await leaderboard(req.query.levelId as string)),
);

async function getSettings() {
  return (await GameSettings.findOne()) || GameSettings.create({});
}

async function queryHistories(query: Record<string, unknown>) {
  const match: Record<string, unknown> = {};
  if (query.result) match.result = query.result;
  if (query.level) match.levelId = query.level;
  if (query.from || query.to) {
    const playedAt: Record<string, Date> = {};
    if (query.from) playedAt.$gte = new Date(String(query.from));
    if (query.to) playedAt.$lte = new Date(String(query.to));
    match.playedAt = playedAt;
  }

  const allWins = await GameHistory.find({ result: "WIN" })
    .sort({ duration: 1, score: -1, moves: 1 })
    .select("_id")
    .lean();
  const winRanks = new Map<string, number>();
  allWins.forEach((w, i) => winRanks.set(String(w._id), i + 1));

  const rows = await GameHistory.find(match)
    .populate("userId")
    .populate("levelId")
    .sort({ playedAt: -1 })
    .lean();

  return rows
    .map((row: any) => {
      if (row.result === "WIN") {
        row.rank = winRanks.get(String(row._id));
      }
      return row;
    })
    .filter((row: any) => {
      const user = row.userId || {};
      return (
        (!query.name ||
          user.fullName
            ?.toLowerCase()
            .includes(String(query.name).toLowerCase())) &&
        (!query.phone || user.phone?.includes(String(query.phone)))
      );
    });
}

function formatHistory(row: any) {
  return {
    "Người dùng": row.userId?.fullName,
    "Số điện thoại": row.userId?.phone,
    "Cấp độ": row.levelId?.name,
    "Kết quả": row.result,
    Điểm: row.score,
    "Thời gian hoàn thành": row.duration,
    "Số bước": row.moves,
    "Ngày chơi": new Date(row.playedAt).toISOString().slice(0, 10),
  };
}

async function leaderboard(levelId?: string) {
  const match: any = { result: "WIN" };
  if (levelId) match.levelId = new mongoose.Types.ObjectId(levelId);

  return GameHistory.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "game_levels",
        localField: "levelId",
        foreignField: "_id",
        as: "level",
      },
    },
    { $unwind: "$level" },
    { $sort: { duration: 1, score: -1, moves: 1 } },
    {
      $group: {
        _id: "$userId",
        bestDuration: { $first: "$duration" },
        score: { $first: "$score" },
        moves: { $first: "$moves" },
        levelName: { $first: "$level.name" },
        plays: { $sum: 1 },
      },
    },
    { $sort: { bestDuration: 1, score: -1, moves: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        fullName: "$user.fullName",
        phone: "$user.phone",
        score: 1,
        plays: 1,
        bestDuration: 1,
        moves: 1,
        levelName: 1,
      },
    },
  ]);
}

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
  if ((await GameLevel.countDocuments()) === 0) {
    await GameLevel.create({
      name: "Easy",
      timeLimit: 90,
      maxScore: 2000,
      quickWinSeconds: 45,
      scoreRules: [
        { withinSeconds: 44, score: 2000 },
        { withinSeconds: 54, score: 1500 },
        { withinSeconds: 74, score: 1000 },
      ],
    });
    console.log("Seeded default Easy level.");
  }

  if ((await GameImage.countDocuments()) === 0) {
    await GameImage.create({
      name: "Move SECC Demo",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      status: "ACTIVE",
      gridSize: 3,
    });
    console.log("Seeded default Game Image.");
  }

  app.listen(port, () =>
    console.log(`API running on http://localhost:${port}`),
  );
});
