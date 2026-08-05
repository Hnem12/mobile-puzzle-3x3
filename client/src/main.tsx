import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  ChevronLeft,
  Download,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
  Zap,
  User,
  Phone,
  MapPin,
  Store,
  Scan,
  Crown,
  ChevronUp,
} from "lucide-react";
import racingBg from "./assets/form-bg.png";
import logoMove from "./assets/logo-move.png";
import logoKingsport from "./assets/logo-kingsport.png";
import imgTop1 from "./assets/top1.png";
import imgTop2 from "./assets/top2.png";
import imgTop3 from "./assets/top3.png";
import formBg from "./assets/form-bg.png";
import resultBg from "./assets/result-bg.png";
import "./styles.css";
import QRCode from "react-qr-code";

const rawApi = import.meta.env.VITE_API_URL;
const API = rawApi
  ? rawApi.endsWith("/api")
    ? rawApi
    : `${rawApi}/api`
  : `http://${window.location.hostname}:4000/api`;
type Level = {
  _id: string;
  name: string;
  timeLimit: number;
  maxScore: number;
  quickWinSeconds: number;
  scoreRules: { withinSeconds: number; score: number }[];
};
type GameImage = {
  _id: string;
  name: string;
  imageUrl: string;
  status: "ACTIVE" | "INACTIVE";
  gridSize: number;
  createdAt: string;
};
type Bootstrap = {
  settings: any;
  levels: Level[];
  images?: GameImage[];
  image?: GameImage | null;
};
const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
});
function App() {
  const isPlay =
    new URLSearchParams(window.location.search).has("play") ||
    location.pathname.startsWith("/play");

  if (
    location.pathname.startsWith("/led") ||
    (location.pathname === "/" && !isPlay)
  ) {
    return <LedScreen />;
  }
  return (
    <div style={{ "--racing-bg": `url(${racingBg})` } as React.CSSProperties}>
      {location.pathname.startsWith("/admin") ? <Admin /> : <Game />}
    </div>
  );
}

function Game() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [image, setImage] = useState<GameImage | null>(null);
  const [user, setUser] = useState<any>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState(
    !(
      new URLSearchParams(window.location.search).has("play") ||
      location.pathname.startsWith("/play")
    ),
  );
  const [bootError, setBootError] = useState("");
  useEffect(() => {
    fetch(`${API}/game/bootstrap`)
      .then((r) => {
        if (!r.ok) throw new Error("Cannot load game data");
        return r.json();
      })
      .then((b) => {
        const imgs =
          b.images && b.images.length > 0 ? b.images : b.image ? [b.image] : [];
        setImage(
          imgs.length > 0
            ? imgs[Math.floor(Math.random() * imgs.length)]
            : null,
        );
        if (b.levels) {
          const order: any = { Easy: 1 };
          b.levels.sort(
            (a: Level, b: Level) =>
              (order[a.name] || 99) - (order[b.name] || 99),
          );
        }
        setBoot(b);
      })
      .catch(() =>
        setBootError(
          "Không kết nối được backend. Vui lòng kiểm tra server Mongo/API.",
        ),
      );
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const handlePopState = () => {
      if (user) {
        if (
          !window.confirm(
            "Bạn có chắc chắn muốn thoát khỏi trò chơi? Tiến trình hiện tại sẽ không được lưu.",
          )
        ) {
          window.history.pushState({ trapped: true }, "", window.location.href);
        } else {
          window.removeEventListener("popstate", handlePopState);
          window.removeEventListener("popstate", handlePopState);
          setLeaderboard(true);
          setUser(null);
          setResult(null);
        }
      }
    };
    if (user) {
      if (!window.history.state?.trapped)
        window.history.pushState({ trapped: true }, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  if (bootError)
    return (
      <main className="game-hero">
        <section className="phone-panel">
          <h1>Lỗi kết nối</h1>
          <p>{bootError}</p>
        </section>
      </main>
    );
  if (!boot)
    return (
      <main className="game-hero">
        <section className="phone-panel">
          <h1>Đang tải...</h1>
        </section>
      </main>
    );
  if (!boot.levels || boot.levels.length === 0)
    return (
      <main className="game-hero">
        <section className="phone-panel">
          <h1>Chưa cấu hình Game</h1>
          <p>
            Vui lòng chạy lệnh cài đặt dữ liệu (seed) hoặc cấu hình mức độ chơi
            trong trang Admin để bắt đầu.
          </p>
        </section>
      </main>
    );

  const activeLevel = boot.levels[0];

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setResult(null);
    if (boot) {
      const imgs =
        boot.images && boot.images.length > 0
          ? boot.images
          : boot.image
            ? [boot.image]
            : [];
      setImage(
        imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)] : null,
      );
    }
  };

  if (leaderboard) return <Leaderboard result={result} />;
  if (result)
    return (
      <Result
        result={result}
        level={activeLevel}
        onReplay={() => setResult(null)}
        onLeaderboard={() => setLeaderboard(true)}
        onLogout={handleLogout}
      />
    );
  if (!user)
    return (
      <Register
        onDone={(u) => {
          localStorage.setItem("user", JSON.stringify(u));
          setUser(u);
        }}
        disabled={!boot.settings.gameStatus}
      />
    );
  return (
    <Puzzle
      user={user}
      level={activeLevel}
      image={image}
      onDone={setResult}
      onLogout={handleLogout}
    />
  );
}

function Register({
  onDone,
  disabled,
}: {
  onDone: (u: any) => void;
  disabled: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] = useState<"retail" | "agency">(
    "retail",
  );
  const [productOfInterest, setProductOfInterest] = useState<
    "move" | "kingsport"
  >("move");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/game/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          address,
          customerType,
          productOfInterest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      res.ok ? onDone(data) : setError(data.message || "Không thể đăng ký");
    } catch {
      setError("Không kết nối được backend, chưa thể lưu người chơi");
    }
  }
  return (
    <main className="game-hero puzzle-hero">
      <section className="phone-panel">
        <BrandHeader />
        <h1>Đăng ký tham gia</h1>
        <form onSubmit={submit} className="game-card stack red-glow">
          <label>
            <span className="label-with-icon">
              <User size={14} /> HỌ VÀ TÊN*
            </span>
            <input
              required
              placeholder="Nhập họ và tên..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label>
            <span className="label-with-icon">
              <Phone size={14} /> SỐ ĐIỆN THOẠI*
            </span>
            <input
              required
              type="tel"
              pattern="0[0-9]{9}"
              maxLength={10}
              title="Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0"
              placeholder="Nhập số điện thoại..."
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label>
            <span className="label-with-icon">
              <MapPin size={14} /> ĐỊA CHỈ
            </span>
            <input
              placeholder="Nhập địa chỉ hiện tại..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <div className="radio-group-label">NHU CẦU MUA SẮM</div>
          <div className="radio-group">
            <button
              type="button"
              className={customerType === "retail" ? "active" : ""}
              onClick={() => setCustomerType("retail")}
            >
              <User size={15} />{" "}
              <span style={{ fontSize: "11px" }}>Khách hàng mua lẻ</span>
            </button>
            <button
              type="button"
              className={customerType === "agency" ? "active" : ""}
              onClick={() => setCustomerType("agency")}
            >
              <Store size={15} />{" "}
              <span style={{ fontSize: "11px" }}>Khách hàng đại lý</span>
            </button>
          </div>

          <div className="radio-group-label">SẢN PHẨM QUAN TÂM</div>
          <div className="radio-group">
            <button
              type="button"
              className={productOfInterest === "move" ? "active" : ""}
              onClick={() => setProductOfInterest("move")}
            >
              Xe điện MOVE
            </button>
            <button
              type="button"
              className={productOfInterest === "kingsport" ? "active" : ""}
              onClick={() => setProductOfInterest("kingsport")}
            >
              Kingsport
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          <button
            className="primary-red"
            disabled={disabled}
            style={{
              minHeight: "54px",
              fontSize: "15px",
              marginTop: "12px",
              borderRadius: "8px",
            }}
          >
            BẮT ĐẦU CHƠI NGAY
          </button>
          <p className="privacy-note" style={{ fontSize: "10px" }}>
            Thông tin này chỉ được sử dụng với mục đích ghi nhận quà tặng sau
            trò chơi
          </p>
        </form>
      </section>
    </main>
  );
}

function Puzzle({
  user,
  level,
  image,
  onDone,
  onLogout,
}: {
  user: any;
  level: Level;
  image: GameImage | null;
  onDone: (r: any) => void;
  onLogout: () => void;
}) {
  const solved = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const [tiles, setTiles] = useState<number[]>(() => shuffleSolvable(solved));
  const [moves, setMoves] = useState(0);
  const [left, setLeft] = useState(level.timeLimit);
  const [finished, setFinished] = useState(false);
  const done = tiles.join() === solved.join();
  useEffect(() => {
    if (finished) return;
    if (done) {
      void finish("WIN");
      return;
    }
    if (left <= 0) {
      void finish("LOSE");
      return;
    }
    const t = setTimeout(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, done, finished]);
  async function finish(result: "WIN" | "LOSE") {
    setFinished(true);
    const duration = level.timeLimit - Math.max(left, 0);
    const score = result === "WIN" ? calcScore(level, duration, moves) : 0;
    try {
      const res = await fetch(`${API}/game/histories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          levelId: level._id,
          result,
          score,
          duration,
          moves,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Cannot save history");
      }
      onDone({
        result,
        score,
        duration,
        moves,
        user,
        rank: data.rank ?? data.history?.rank,
      });
    } catch (e: any) {
      alert(
        e.message ||
          "Không lưu được lịch sử chơi vào backend. Vui lòng thử lại hoặc kiểm tra API/Mongo.",
      );
      setFinished(false);
    }
  }
  function move(i: number) {
    const blank = tiles.indexOf(0);

    let valid = false;
    if (i === 0 && blank === 1) valid = true;
    else if (i === 1 && blank === 0) valid = true;
    else if (i >= 1 && blank >= 1) {
      const gridI = i - 1;
      const gridB = blank - 1;
      const xI = gridI % 3,
        yI = Math.floor(gridI / 3);
      const xB = gridB % 3,
        yB = Math.floor(gridB / 3);
      if (Math.abs(xI - xB) + Math.abs(yI - yB) === 1) valid = true;
    }

    if (!valid) return;

    const next = [...tiles];
    [next[i], next[blank]] = [next[blank], next[i]];
    setTiles(next);
    setMoves((m) => m + 1);
  }
  const correctCount = tiles.reduce(
    (acc, tile, idx) => acc + (tile !== 0 && tile === solved[idx] ? 1 : 0),
    0,
  );

  return (
    <main
      className="play-screen"
      style={{ "--racing-bg": `url(${formBg})` } as React.CSSProperties}
    >
      <BrandHeader />

      <div className="puzzle-header-info">
        <div className="player-info-col">
          <div className="player-name-wrap">
            <span className="muted-label">
              <User size={14} /> Người chơi
            </span>
            <h2 className="player-name">{truncateName(user.fullName)}</h2>
          </div>
          <div className="instruction-wrap">
            <strong className="correct-count">
              {correctCount}/9 vị trí đúng
            </strong>
            <p className="instruction-text">
              Bấm vào các ô kề ô trống để di chuyển thành hình hoàn thiện
            </p>
          </div>
        </div>
        <div className="sample-image-col">
          <div className="sample-card">
            <div className="sample-card-header">HÌNH ẢNH HOÀN CHỈNH</div>
            {image ? (
              <img className="sample-img" src={image.imageUrl} alt="Mẫu" />
            ) : (
              <div className="sample-placeholder" />
            )}
          </div>
        </div>
      </div>

      <div className="game-board-container">
        <div className="game-board-header">
          <button
            className={`moves-box ${!tiles[0] ? "blank" : ""}`}
            onClick={() => move(0)}
            style={{
              cursor: "pointer",
              padding: 0,
              border: !tiles[0] ? "1px dashed rgba(239,28,48,.8)" : "none",
              background: !tiles[0] ? "rgba(0,0,0,.38)" : "#ef1c30",
              boxShadow: !tiles[0] ? "none" : undefined,
              ...(tiles[0] ? tileStyle(tiles[0], image?.imageUrl) : {}),
            }}
          >
            {!image && tiles[0] ? (
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  textShadow:
                    "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)",
                }}
              >
                {tiles[0]}
              </span>
            ) : null}
            {!tiles[0] && (
              <div
                style={{ position: "relative", width: "100%", height: "100%" }}
              >
                <ChevronUp
                  size={24}
                  className="blank-arrow-up"
                  style={{ top: 4 }}
                />
                <ChevronLeft
                  size={24}
                  className="blank-arrow-left"
                  style={{ left: 4 }}
                />
              </div>
            )}
          </button>
          <div className="time-box">{left.toFixed(2)}s</div>
        </div>

        <section className="board">
          {tiles.slice(1).map((tile, i) => {
            const actualIndex = i + 1;
            return (
              <button
                key={actualIndex}
                className={tile ? "tile" : "blank"}
                onClick={() => move(actualIndex)}
                style={tile ? tileStyle(tile, image?.imageUrl) : {}}
              >
                {!image && tile ? (
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 900,
                      color: "white",
                    }}
                  >
                    {tile}
                  </span>
                ) : null}
                {!tile && (
                  <>
                    <ChevronUp size={24} className="blank-arrow-up" />
                    <ChevronLeft size={24} className="blank-arrow-left" />
                  </>
                )}
              </button>
            );
          })}
        </section>
      </div>
      <button
        className="primary-red"
        disabled={!done}
        onClick={() => finish("WIN")}
      >
        NỘP KẾT QUẢ
      </button>
    </main>
  );
}

function Result({
  result,
  level,
  onReplay,
  onLeaderboard,
  onLogout,
}: {
  result: any;
  level: Level;
  onReplay: () => void;
  onLeaderboard: () => void;
  onLogout: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/game/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Cannot load leaderboard");
        return r.json();
      })
      .then((data: any[]) => {
        const sorted = [...data].sort((a, b) => {
          const aDuration = a.bestDuration ?? Infinity;
          const bDuration = b.bestDuration ?? Infinity;
          if (aDuration !== bDuration) {
            return aDuration - bDuration;
          }
          return (b.bestScore ?? 0) - (a.bestScore ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([]));
  }, []);
  const fallbackCurrent = result.user
    ? {
        fullName: result.user.fullName,
        phone: result.user.phone,
        bestDuration: result.duration,
        score: result.score,
      }
    : null;
  const rankedRows = rows.length
    ? rows
    : fallbackCurrent
      ? [fallbackCurrent]
      : [];
  const podium = [rankedRows[1], rankedRows[0], rankedRows[2]];
  const podiumLabels = ["TOP 2", "TOP 1", "TOP 3"];
  const currentIndex = result.user?.phone
    ? rankedRows.findIndex((row) => row.phone === result.user.phone)
    : -1;
  const currentRank =
    result.rank ?? (currentIndex >= 0 ? currentIndex + 1 : null);
  const isPlayerInTop = currentRank !== null && currentRank <= 5;
  const shouldShowBottomRank = result && currentRank !== null && !isPlayerInTop;
  const rest = rankedRows.slice(3, 5);
  return (
    <main
      className="game-hero result-hero"
      style={{ "--result-bg": `url(${resultBg})` } as React.CSSProperties}
    >
      <section className="phone-panel result">
        <div className="confetti" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <BrandHeader />
        <h1>
          {result.result === "WIN" ? "HOÀN THÀNH THỬ THÁCH" : "HẾT THỜI GIAN"}
        </h1>
        <p className="muted-label">Thời gian của bạn</p>
        <strong className="time-result">{formatTime(result.duration)}</strong>
        <b
          className="winner-copy"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
          }}
        >
          Thật tuyệt vời <Crown color="#ffd72a" fill="#ffd72a" size={20} />
        </b>
        <p className="result-copy">
          Bạn đã nằm trong <b style={{ color: "white" }}>Top {currentRank}</b>{" "}
          của MOVE to be KING. Chúc mừng bạn đã nhận được phần quà độc quyền.
          Liên tục cập nhật BXH để theo dõi cơ hội nhận{" "}
          <b>01 chiếc xe máy điện Athena.</b>
        </p>

        <div className="leaderboard-card">
          <div className="top-board">
            {podium.map((row, i) => {
              const isMe =
                row?.phone &&
                result?.user?.phone &&
                row.phone === result.user.phone;
              return (
                <article
                  className={`top-card top-${i + 1}`}
                  key={podiumLabels[i]}
                >
                  <div className="prize-orb">
                    <span className="prize-orb-text">{podiumLabels[i]}</span>
                  </div>
                  <b>{isMe ? "Bạn" : truncateName(row?.fullName || "Chưa có dữ liệu")}</b>
                  <time>{formatTime(row?.bestDuration)}</time>
                </article>
              );
            })}
          </div>
          <div className="rank-list compact">
            {rest.length ? (
              rest.map((row, i) => {
                const isMe =
                  row?.phone &&
                  result?.user?.phone &&
                  row.phone === result.user.phone;
                return (
                  <div
                    className="rank-item"
                    key={row.phone || i}
                    style={
                      isMe
                        ? {
                            background: "rgba(239, 28, 48, 0.15)",
                            border: "1px solid rgba(239, 28, 48, 0.3)",
                            borderRadius: 8,
                            padding: "14px 16px",
                          }
                        : {}
                    }
                  >
                    <span
                      className="rank-idx"
                      style={
                        isMe
                          ? {
                              background: "#ef1c30",
                              color: "white",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }
                          : {}
                      }
                    >
                      {i + 4}
                    </span>
                    <div className="rank-info">
                      <strong style={isMe ? { color: "white", fontSize: "14px", fontWeight: 800 } : {}}>{isMe ? "Bạn" : truncateName(row.fullName)}</strong>
                      {row.phone && (
                        <small>
                          {row.phone.slice(0, 3)}***{row.phone.slice(-3)}
                        </small>
                      )}
                    </div>
                    <b
                      className="rank-time"
                      style={{ color: isMe ? "#ef1c30" : undefined }}
                    >
                      {formatTime(row.bestDuration)}
                    </b>
                  </div>
                );
              })
            ) : (
              <div className="rank-item" style={{ opacity: 0.5 }}>
                <span className="rank-idx">04</span>
                <div className="rank-info">
                  <strong>Chưa có thêm người chơi</strong>
                </div>
                <b className="rank-time">--</b>
              </div>
            )}
            
            {shouldShowBottomRank && (
              <div className="rank-item" style={{ background: "rgba(239, 28, 48, 0.15)", border: "1px solid rgba(239, 28, 48, 0.3)", borderRadius: 8, marginTop: 8 }}>
                <span className="rank-idx" style={{ background: "#ef1c30", color: "white", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {currentRank}
                </span>
                <div className="rank-info">
                  <strong style={{ color: "white", fontSize: "14px", fontWeight: 800 }}>{truncateName(result.user?.fullName || "Bạn")} (Bạn)</strong>
                  {result.user?.phone && (
                    <small>
                      {result.user.phone.slice(0, 3)}***{result.user.phone.slice(-3)}
                    </small>
                  )}
                </div>
                <b className="rank-time" style={{ color: "#ef1c30" }}>{formatTime(result.duration)}</b>
              </div>
            )}
          </div>
        </div>
        <button className="primary-red notify" onClick={() => onLeaderboard()}>
          <Bell size={16} color="white" /> THEO DÕI BẢNG XẾP HẠNG QUA ZALO NGAY
        </button>
      </section>
    </main>
  );
}

function Leaderboard({ result }: { result?: any }) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/game/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Cannot load leaderboard");
        return r.json();
      })
      .then((data: any[]) => {
        const sorted = [...data].sort((a, b) => {
          const aDuration = a.bestDuration ?? Infinity;
          const bDuration = b.bestDuration ?? Infinity;
          if (aDuration !== bDuration) {
            return aDuration - bDuration;
          }
          return (b.bestScore ?? 0) - (a.bestScore ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([]));
  }, []);

  const podium = [rows[1], rows[0], rows[2]];
  const podiumLabels = ["TOP 2", "TOP 1", "TOP 3"];
  const rest = rows.slice(3);

  const currentIndex = result?.user?.phone
    ? rows.findIndex((row) => row.phone === result.user.phone)
    : -1;
  const currentRank =
    result?.rank ?? (currentIndex >= 0 ? currentIndex + 1 : null);

  const isPlayerInTop = currentRank !== null && currentRank <= 10;
  const shouldShowBottomRank = result && currentRank !== null && !isPlayerInTop;

  return (
    <main className="game-hero leaderboard-screen">
      <section className="leaderboard-panel">
        <BrandHeader />
        <div className="leaderboard-header-title">
          <h1>
            <span className="bolt">
              <Zap size={22} fill="currentColor" />
            </span>{" "}
            MOVE TO BE KING
          </h1>
          <p className="subtitle" style={{ color: "red" }}>
            THE FASTER HAND
          </p>
        </div>
        <div className="leaderboard-top-board">
          {podium.map((row, i) => {
            const isMe =
              row?.phone &&
              result?.user?.phone &&
              row.phone === result.user.phone;
            return (
              <article
                className={`top-card top-${i + 1}`}
                key={podiumLabels[i]}
              >
                <div className="prize-orb">
                  <span className="prize-orb-text">{podiumLabels[i]}</span>
                </div>
                <b>{isMe ? "Bạn" : truncateName(row?.fullName || "Đang chờ")}</b>
                <time>{formatTime(row?.bestDuration)}</time>
              </article>
            );
          })}
        </div>

        <div className="rank-list compact mobile-rank-list">
          {rest.length ? (
            rest.map((r, i) => {
              const isMe =
                r?.phone &&
                result?.user?.phone &&
                r.phone === result.user.phone;
              return (
                <p
                  key={r.phone || i}
                  style={
                    isMe
                      ? {
                          background: "rgba(239, 28, 48, 0.15)",
                          border: "1px solid rgba(239, 28, 48, 0.3)",
                          borderRadius: 8,
                          padding: "14px 16px",
                          gridTemplateColumns: "28px 1fr auto",
                        }
                      : {}
                  }
                >
                  <span
                    style={
                      isMe
                        ? {
                            background: "#ef1c30",
                            color: "white",
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }
                        : {}
                    }
                  >
                    {String(i + 4).padStart(2, "0")}
                  </span>
                  <strong style={isMe ? { color: "white", fontSize: "14px", fontWeight: 800 } : {}}>{isMe ? "Bạn" : truncateName(r.fullName)}</strong>
                  <b style={{ color: isMe ? "#ef1c30" : undefined }}>
                    {formatTime(r.bestDuration)}
                  </b>
                </p>
              );
            })
          ) : (
            <p>
              <span>04</span>
              <strong>Chưa có thêm người chơi</strong>
              <b>--</b>
            </p>
          )}

          {shouldShowBottomRank && (
            <p
              style={{
                marginTop: 12,
                background: "rgba(239, 28, 48, 0.15)",
                borderRadius: 8,
                border: "1px solid rgba(239, 28, 48, 0.3)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ef1c30",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "white",
                  }}
                />
              </span>
              <strong style={{ flex: 1 }}>Bạn (hạng {currentRank})</strong>
              <b style={{ color: "#ef1c30" }}>{formatTime(result.duration)}</b>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function LedScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    fetch(`${API}/game/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Cannot load leaderboard");
        return r.json();
      })
      .then((data: any[]) => {
        const sorted = [...data].sort((a, b) => {
          const aDuration = a.bestDuration ?? Infinity;
          const bDuration = b.bestDuration ?? Infinity;
          if (aDuration !== bDuration) {
            return aDuration - bDuration;
          }
          return (b.bestScore ?? 0) - (a.bestScore ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([]));
  }, []);

  // Poll for updates on LED screen
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API}/game/leaderboard`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          const sorted = [...data].sort((a, b) => {
            const aDuration = a.bestDuration ?? Infinity;
            const bDuration = b.bestDuration ?? Infinity;
            if (aDuration !== bDuration) {
              return aDuration - bDuration;
            }
            return (b.bestScore ?? 0) - (a.bestScore ?? 0);
          });
          setRows(sorted);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current || !containerRef.current.parentElement) return;
      const winW = containerRef.current.parentElement.clientWidth;
      const winH = containerRef.current.parentElement.clientHeight;
      const scaleW = winW / 1080;
      const scaleH = winH / 1920;
      setScale({ x: scaleW, y: scaleH });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const podium = [rows[1], rows[0], rows[2]];
  const podiumLabels = ["TOP 2", "TOP 1", "TOP 3"];
  const rest = rows.slice(3);

  return (
    <main className="led-screen">
      <div
        ref={containerRef}
        className="led-container"
        style={{ transform: `scale(${scale.x}, ${scale.y})` }}
      >
        {/* Header */}
        <div className="led-header">
          <div className="led-brand-box">
            <img src={logoMove} alt="Move" className="led-logo" />
            <X
              size={26}
              strokeWidth={3}
              color="#94a3b8"
              className="led-cross"
            />
            <img src={logoKingsport} alt="Kingsport" className="led-logo" />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "70px",
            }}
          >
            <Zap
              fill="#ef1c30"
              color="#ef1c30"
              size={46}
              strokeWidth={3}
              className="led-zap"
            />
            <h1 className="led-title-main">MOVE TO BE KING</h1>
            <h2 className="led-title-sub">THE FASTER HAND</h2>
          </div>
        </div>

        {/* Podium */}
        <div className="led-podium-section">
          {podium.map((row, i) => (
            <div
              className={`led-top-card led-pos-${i + 1}`}
              key={podiumLabels[i]}
            >
              <div className="led-orb">
                <img
                  src={[imgTop2, imgTop1, imgTop3][i]}
                  alt={podiumLabels[i]}
                />
              </div>
              <strong className="led-rank-label">
                TOP {i === 0 ? 2 : i === 1 ? 1 : 3}
              </strong>
              <strong className="led-name">
                {truncateName(row?.fullName || "Đang chờ")}
              </strong>
              <time className="led-time">{formatTime(row?.bestDuration)}</time>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="led-list-wrapper">
          <div className="led-rank-list-inner">
            {rest.length ? (
              rest.map((r, i) => (
                <div className="led-rank-row" key={r.phone || i}>
                  <div className="led-rank-index">
                    {String(i + 4).padStart(2, "0")}
                  </div>
                  <div className="led-rank-name">{truncateName(r.fullName)}</div>
                  <div className="led-rank-time">
                    {formatTime(r.bestDuration)}
                  </div>
                </div>
              ))
            ) : (
              <div className="led-rank-row">
                <div className="led-rank-index">04</div>
                <div className="led-rank-name">Chưa có thêm người chơi</div>
                <div className="led-rank-time">--</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="led-footer">
          <div className="led-rules-box">
            <h3 className="led-rules-title">THỂ LỆ QUÀ TẶNG</h3>
            <p className="led-rules-desc">
              Người chơi phá kỷ lục Top 3 tại thời điểm tham gia sẽ nhận ngay
              quà tặng độc quyền từ thương hiệu.
              <br />
              Kết thúc chương trình, Top 3 chung cuộc trên bảng xếp hạng sẽ
              nhận:
            </p>
            <p>
              <b>Top 1:</b> 01 xe máy điện MOVE Athena
            </p>
            <p>
              <b>Top 2:</b> 01 máy massage cầm tay Kingsport
            </p>
            <p>
              <b>Top 3:</b> 01 máy massage cầm tay Kingsport
            </p>
          </div>
          <div className="led-qr-section">
            <div className="led-qr-bg">
              <QRCode
                value="https://mobile-puzzle-3x3.pages.dev/?play=1"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <span className="led-qr-text">Quét QR tham gia đường đua ngay</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatSeconds(value: unknown) {
  return typeof value === "number" ? `${value.toFixed(2)}s` : "--";
}
function formatTime(value: unknown) {
  return typeof value === "number"
    ? `00:${value.toFixed(2).padStart(5, "0")}`
    : "--";
}
function maskPhone(value: unknown) {
  const phone = String(value || "");
  return phone.length >= 6 ? `${phone.slice(0, 3)}***${phone.slice(-3)}` : "";
}

function truncateName(name: unknown, maxLen = 15) {
  const str = String(name || "");
  if (str.length <= maxLen) return str;
  const charsToShow = maxLen - 3;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return str.substring(0, frontChars) + "..." + str.substring(str.length - backChars);
}

function BrandHeader() {
  return (
    <div className="brand-row">
      <img src={logoMove} alt="Move" className="brand-logo move-logo" />
      <X size={10} strokeWidth={3} color="#fff" className="brand-cross" />
      <img
        src={logoKingsport}
        alt="Kingsport"
        className="brand-logo kingsport-logo"
      />
    </div>
  );
}

function Admin() {
  const [token, setToken] = useState(localStorage.getItem("adminToken"));
  const [tab, setTab] = useState("images");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
  };

  if (!token) return <Login onDone={setToken} />;
  const [exporting, setExporting] = useState(false);

  async function exportNocodb() {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xuất toàn bộ lịch sử chơi sang NocoDB?",
      )
    )
      return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/admin/nocodb/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
        },
      });
      const data = await res.json();
      alert(data.message || "Đã xuất dữ liệu thành công");
    } catch (e) {
      alert("Lỗi khi xuất dữ liệu sang NocoDB.");
    }
    setExporting(false);
  }

  return (
    <main className="admin">
      <nav className="admin-nav">
        <button
          className={tab === "images" ? "active" : ""}
          onClick={() => setTab("images")}
        >
          Hình ảnh
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Lịch sử chơi
        </button>
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          Thông tin người chơi
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          Cấu hình Game
        </button>
        <button
          className={tab === "api_settings" ? "active" : ""}
          onClick={() => setTab("api_settings")}
        >
          Cấu hình API
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {/* <button
            onClick={exportNocodb}
            disabled={exporting}
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              padding: "0 15px",
              borderRadius: "6px",
              fontWeight: 500,
            }}
          >
            {exporting ? "Đang xuất..." : "Xuất dữ liệu vào Nocodb"}
          </button> */}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Đăng xuất
          </button>
        </div>
      </nav>
      {tab === "images" && <Images />}
      {tab === "history" && <History />}
      {tab === "users" && <Users />}
      {tab === "settings" && <Settings />}
      {tab === "api_settings" && <ApiSettings />}
    </main>
  );
}

function Login({ onDone }: { onDone: (t: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (r.ok && d.token) {
        localStorage.setItem("adminToken", d.token);
        onDone(d.token);
      } else {
        setError(d.message || "Tài khoản hoặc mật khẩu không đúng");
      }
    } catch {
      setError("Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-container">
      <div className="login-card">
        <BrandHeader />
        <h2>Đăng nhập Hệ thống</h2>
        <p className="login-subtitle">
          Vui lòng đăng nhập để truy cập trang quản trị
        </p>

        <form className="stack" onSubmit={login}>
          <label className="login-label">
            Tên đăng nhập
            <input
              required
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="login-label">
            Mật khẩu
            <input
              required
              type="password"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="error login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Images() {
  const [images, setImages] = useState<GameImage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const load = () =>
    fetch(`${API}/admin/images`, { headers: auth() })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.reload();
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then((data) => setImages(Array.isArray(data) ? data : []));
  useEffect(() => {
    void load();
  }, []);
  async function upload() {
    if (!file) return;
    const f = new FormData();
    f.append("image", file);
    f.append("name", file.name);
    f.append("gridSize", "3");
    await fetch(`${API}/admin/images`, {
      method: "POST",
      headers: auth(),
      body: f,
    });
    setFile(null);
    load();
  }
  return (
    <section>
      <h1>Hình ảnh</h1>
      <div className="admin-card compact-upload">
        <h3>Upload ảnh mới</h3>
        <div className="upload-row">
          <label className="file-label">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
            <span className="file-name">
              {file ? file.name : "Nhấn để chọn ảnh từ máy..."}
            </span>
          </label>
          <button
            onClick={upload}
            disabled={!file}
            className={file ? "btn-upload-ready" : ""}
          >
            <Upload size={16} /> Tải lên
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Xem trước</th>
              <th>Lưới</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img._id}>
                <td>
                  <img className="thumb" src={img.imageUrl} />
                </td>
                <td>
                  <span className="pill">3x3</span>
                </td>
                <td>
                  <span className={img.status === "ACTIVE" ? "ok" : "bad"}>
                    {img.status === "ACTIVE" ? "Hoạt động" : "Tạm dừng"}
                  </span>
                </td>
                <td>{img.createdAt?.slice(0, 10)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={img.status === "ACTIVE" ? "warning" : "ok"}
                      onClick={() =>
                        fetch(`${API}/admin/images/${img._id}/status`, {
                          method: "PATCH",
                          headers: {
                            ...auth(),
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status:
                              img.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                          }),
                        }).then(load)
                      }
                    >
                      {img.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        fetch(`${API}/admin/images/${img._id}`, {
                          method: "DELETE",
                          headers: auth(),
                        }).then(load)
                      }
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function History() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch(`${API}/admin/histories?name=${encodeURIComponent(q)}`, {
      headers: auth(),
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.reload();
          return [];
        }
        if (!r.ok) throw new Error("Cannot load histories");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return setRows([]);

        const sorted = [...data].sort((a, b) => {
          if (a.result !== b.result) {
            return a.result === "WIN" ? -1 : 1;
          }

          const aDuration = a.duration ?? a.bestDuration ?? Infinity;
          const bDuration = b.duration ?? b.bestDuration ?? Infinity;
          if (aDuration !== bDuration) {
            return aDuration - bDuration;
          }

          const aScore = a.score ?? a.bestScore ?? 0;
          const bScore = b.score ?? b.bestScore ?? 0;
          return bScore - aScore;
        });

        setRows(sorted);
      })
      .catch(() => setRows([]));
  }, [q]);
  async function exportExcel() {
    const res = await fetch(`${API}/admin/histories/export?name=${q}`, {
      headers: auth(),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "game-histories.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportNocodb() {
    if (
      !window.confirm("Bạn có chắc chắn muốn xuất toàn bộ dữ liệu sang NocoDB?")
    )
      return;
    try {
      const res = await fetch(`${API}/admin/nocodb/export`, {
        method: "POST",
        headers: auth(),
      });
      const data = await res.json();
      alert(data.message || "Đã xuất dữ liệu thành công");
    } catch (e) {
      alert("Lỗi khi xuất dữ liệu sang NocoDB.");
    }
  }

  return (
    <section>
      <h1>Lịch sử chơi</h1>
      <div className="filters">
        <input
          placeholder="Tìm tên..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={exportExcel}>
          <Download size={18} /> Xuất Excel
        </button>
        <button type="button" onClick={exportNocodb}>
          <Download size={18} /> Xuất NocoDB
        </button>
      </div>
      <p>
        Tổng: <b>{rows.length}</b> bản ghi
      </p>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Thứ hạng</th>
              <th>Người dùng</th>
              <th>Số điện thoại</th>
              <th>Kết quả</th>
              <th>Điểm</th>
              <th>Thời gian (s)</th>
              <th>Bước</th>
              <th>Ngày chơi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id}>
                <td>
                  {r.result === "WIN" && r.rank ? (
                    <span
                      style={{
                        fontWeight: r.rank <= 10 ? "bold" : "normal",
                        color: r.rank <= 3 ? "#ef4444" : "inherit",
                      }}
                    >
                      Top {r.rank}
                    </span>
                  ) : (
                    "--"
                  )}
                </td>
                <td>{r.userId?.fullName}</td>
                <td>{r.userId?.phone}</td>
                <td>
                  <span className={r.result === "WIN" ? "ok" : "bad"}>
                    {r.result}
                  </span>
                </td>
                <td>{r.score}</td>
                <td>{r.duration}</td>
                <td>{r.moves}</td>
                <td>{r.playedAt?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch(`${API}/admin/users?q=${encodeURIComponent(q)}`, { headers: auth() })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.reload();
          return [];
        }
        if (!r.ok) throw new Error("Cannot load users");
        return r.json();
      })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, [q]);
  async function exportExcel() {
    const res = await fetch(`${API}/admin/users/export?q=${q}`, {
      headers: auth(),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportNocodb() {
    if (
      !window.confirm("Bạn có chắc chắn muốn xuất toàn bộ dữ liệu sang NocoDB?")
    )
      return;
    try {
      const res = await fetch(`${API}/admin/nocodb/export`, {
        method: "POST",
        headers: auth(),
      });
      const data = await res.json();
      alert(data.message || "Đã xuất dữ liệu thành công");
    } catch (e) {
      alert("Lỗi khi xuất dữ liệu sang NocoDB.");
    }
  }

  return (
    <section>
      <h1>Thông tin người chơi</h1>
      <div className="filters">
        <input
          placeholder="Tìm tên hoặc SĐT..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={exportExcel}>
          <Download size={18} /> Xuất Excel
        </button>
        <button type="button" onClick={exportNocodb}>
          <Download size={18} /> Xuất NocoDB
        </button>
      </div>
      <p>
        Tổng: <b>{rows.length}</b> bản ghi
      </p>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ</th>
              <th>Nhu cầu mua sắm</th>
              <th>Sản phẩm quan tâm</th>
              <th>Ngày đăng ký</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.fullName}</td>
                <td>{r.phone}</td>
                <td>{r.address || ""}</td>
                <td>
                  {r.customerType === "agency"
                    ? "Khách hàng đại lý"
                    : "Khách hàng mua lẻ"}
                </td>
                <td>
                  {r.productOfInterest === "kingsport"
                    ? "Kingsport"
                    : "Xe điện MOVE"}
                </td>
                <td>{r.createdAt?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Settings() {
  const [levels, setLevels] = useState<Level[]>([]);
  const load = () =>
    fetch(`${API}/admin/levels`, { headers: auth() })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.reload();
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then((data) => setLevels(Array.isArray(data) ? data : []));

  useEffect(() => {
    load();
  }, []);

  function patch(i: number, data: Partial<Level>) {
    setLevels((v) => v.map((l, ix) => (ix === i ? { ...l, ...data } : l)));
  }

  async function saveLevel(i: number) {
    const current = levels[i];
    await fetch(`${API}/admin/levels/${current._id}`, {
      method: "PUT",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify(current),
    });
    alert(`Lưu cấu hình thành công!`);
  }

  async function createDefaultLevel() {
    await fetch(`${API}/admin/levels`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Easy",
        timeLimit: 90,
        maxScore: 2000,
        quickWinSeconds: 45,
        scoreRules: [
          { withinSeconds: 44, score: 2000 },
          { withinSeconds: 54, score: 1500 },
          { withinSeconds: 74, score: 1000 },
        ],
      }),
    });
    alert(`Đã khởi tạo dữ liệu mặc định!`);
    load();
  }

  return (
    <section>
      <h1>Cấu hình Game</h1>
      {levels.length === 0 ? (
        <div
          className="admin-card"
          style={{ textAlign: "center", padding: 40 }}
        >
          <h3>Chưa có cấu hình nào</h3>
          <p>
            Database hiện tại đang trống. Vui lòng khởi tạo cấu hình mặc định để
            Game có thể hoạt động.
          </p>
          <button
            onClick={createDefaultLevel}
            className="primary-red"
            style={{ marginTop: 15 }}
          >
            Khởi tạo Cấu hình Mặc định
          </button>
        </div>
      ) : (
        <div className="level-grid">
          {levels.map((l, i) => (
            <article className="config-card" key={l._id}>
              <h3>
                Mức độ mặc định <span>3x3</span>
              </h3>
              <label>
                Thời gian (giây)
                <input
                  type="number"
                  value={l.timeLimit}
                  onChange={(e) => patch(i, { timeLimit: +e.target.value })}
                />
              </label>
              <label>
                Điểm tối đa
                <input
                  type="number"
                  value={l.maxScore}
                  onChange={(e) => patch(i, { maxScore: +e.target.value })}
                />
              </label>
              <button onClick={() => saveLevel(i)}>Lưu cấu hình</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function shuffleSolvable(solved: number[]): number[] {
  const arr = [...solved];
  for (let n = 0; n < 80; n++) {
    const blank = arr.indexOf(0);
    const moves = [];
    if (blank === 0) moves.push(1);
    else if (blank === 1) moves.push(0);

    if (blank >= 1) {
      const gridIndex = blank - 1;
      const x = gridIndex % 3;
      const y = Math.floor(gridIndex / 3);
      if (x > 0) moves.push(blank - 1);
      if (x < 2) moves.push(blank + 1);
      if (y > 0) moves.push(blank - 3);
      if (y < 2) moves.push(blank + 3);
    }

    const pick = moves[Math.floor(Math.random() * moves.length)];
    [arr[blank], arr[pick]] = [arr[pick], arr[blank]];
  }

  let blank = arr.indexOf(0);
  while (blank !== 9) {
    let nextBlank = blank;
    if (blank === 0) {
      nextBlank = 1;
    } else {
      const gridIndex = blank - 1;
      const x = gridIndex % 3;
      const y = Math.floor(gridIndex / 3);
      if (x < 2) nextBlank = blank + 1;
      else if (y < 2) nextBlank = blank + 3;
    }
    [arr[blank], arr[nextBlank]] = [arr[nextBlank], arr[blank]];
    blank = nextBlank;
  }

  return arr.join() === solved.join() ? shuffleSolvable(solved) : arr;
}
function tileStyle(tile: number, url?: string): React.CSSProperties {
  const x = (tile - 1) % 3,
    y = Math.floor((tile - 1) / 3);
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: "300% 300%",
    backgroundPosition: `${x * 50}% ${y * 50}%`,
  };
}
function calcScore(level: Level, duration: number, moves: number) {
  const rule = [...level.scoreRules]
    .sort((a, b) => a.withinSeconds - b.withinSeconds)
    .find((r) => duration <= r.withinSeconds);
  return Math.max(
    100,
    (rule?.score || Math.round(level.maxScore * 0.5)) - moves * 10,
  );
}

function ApiSettings() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/settings`, { headers: auth() })
      .then((r) => r.json())
      .then((data) => {
        if (data && !Array.isArray(data)) {
          setConfig(data);
        }
      });
  }, []);

  const handleFormatJson = (field: "apiHeaders" | "apiBody") => {
    try {
      if (config[field]) {
        const parsed = JSON.parse(config[field]);
        setConfig((prev: any) => ({
          ...prev,
          [field]: JSON.stringify(parsed, null, 2),
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleFormatGetUrl = () => {
    try {
      if (!config.apiGetUrl) return;
      let url = config.apiGetUrl;
      try {
        url = decodeURI(url);
      } catch (e) {}

      const parts = url.split("?");
      if (parts.length > 1) {
        const baseUrl = parts[0];
        const query = parts.slice(1).join("?");
        const params = query.split("&");
        const formattedParams = params.map((p: string) => {
          const eqIdx = p.indexOf("=");
          if (eqIdx > -1) {
            const key = p.substring(0, eqIdx);
            const val = p.substring(eqIdx + 1);
            try {
              let parsed = JSON.parse(decodeURIComponent(val));
              if (typeof parsed === "object" && parsed !== null) {
                return `${key}=${JSON.stringify(parsed, null, 2)}`;
              }
            } catch (e) {}
          }
          return p;
        });
        setConfig((prev: any) => ({
          ...prev,
          apiGetUrl: `${baseUrl}?${formattedParams.join("&")}`,
        }));
      }
    } catch (e) {}
  };

  async function save() {
    setLoading(true);
    try {
      await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("Lưu cấu hình API thành công!");
    } catch (e) {
      alert("Lỗi khi lưu cấu hình API.");
    }
    setLoading(false);
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          width: "100%",
        }}
      >
        <h1
          style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}
        >
          Cấu hình API
        </h1>
        <button
          onClick={save}
          disabled={loading}
          style={{
            minHeight: 40,
            padding: "0 20px",
            background: "#0f172a",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>

      <div
        className="admin-card stack"
        style={{
          width: "100%",
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          padding: "32px 36px",
          gap: 28,
          borderRadius: 12,
          flexDirection: "column",
          flexWrap: "nowrap",
          alignItems: "stretch",
        }}
      >
        <div style={{ alignSelf: "flex-start" }}>
          <button
            type="button"
            onClick={() => setShowHint(true)}
            style={{
              background: "transparent",
              color: "#3b82f6",
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
              minHeight: "auto",
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Xem danh sách biến tự động
          </button>

          {showHint && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  width: "100%",
                  maxWidth: 600,
                  boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>
                    Danh sách biến
                  </h3>
                  <button
                    onClick={() => setShowHint(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      padding: 8,
                      cursor: "pointer",
                      minHeight: "auto",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: 24 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      background: "white",
                      boxShadow: "none",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            background: "transparent",
                            color: "#94a3b8",
                            fontSize: 12,
                            textTransform: "uppercase",
                            padding: "8px 12px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          TÊN BIẾN
                        </th>
                        <th
                          style={{
                            background: "transparent",
                            color: "#94a3b8",
                            fontSize: 12,
                            textTransform: "uppercase",
                            padding: "8px 12px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          MÔ TẢ
                        </th>
                        <th
                          style={{
                            background: "transparent",
                            color: "#94a3b8",
                            fontSize: 12,
                            textTransform: "uppercase",
                            padding: "8px 12px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          LOẠI DỮ LIỆU
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: "{{top}}", desc: "Thứ hạng", type: "NUMBER" },
                        {
                          code: "{{phone}}",
                          desc: "Số điện thoại",
                          type: "TEXT",
                        },
                        {
                          code: "{{name}}",
                          desc: "Tên người chơi",
                          type: "TEXT",
                        },
                        {
                          code: "{{result}}",
                          desc: "Kết quả chơi (WIN/LOSE)",
                          type: "TEXT",
                        },
                        {
                          code: "{{moves}}",
                          desc: "Bước di chuyển",
                          type: "NUMBER",
                        },
                        {
                          code: "{{duration}}",
                          desc: "Thời gian",
                          type: "NUMBER",
                        },
                        { code: "{{score}}", desc: "Điểm", type: "NUMBER" },
                      ].map((v) => (
                        <tr key={v.code}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(v.code);
                                alert("Đã copy: " + v.code);
                              }}
                              style={{
                                background: "#f3e8ff",
                                color: "#9333ea",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 13,
                                fontFamily: "monospace",
                                border: "none",
                                cursor: "pointer",
                                minHeight: "auto",
                                transition: "background 0.2s",
                              }}
                              title="Click để copy"
                            >
                              {v.code}
                            </button>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: 14,
                              color: "#475569",
                            }}
                          >
                            {v.desc}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: 14,
                              color: "#475569",
                            }}
                          >
                            {v.type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p
                    style={{
                      margin: "16px 0 0",
                      fontSize: 13,
                      color: "#64748b",
                      textAlign: "center",
                    }}
                  >
                    * Nhấn vào tên biến để copy nhanh.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <label
          style={{
            display: "grid",
            gap: 10,
            fontSize: 15,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Post API URL
          <input
            value={config.apiPostUrl || ""}
            onChange={(e) =>
              setConfig({ ...config, apiPostUrl: e.target.value })
            }
            placeholder="https://api.smax.ai/..."
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd4df",
              minHeight: 46,
              borderRadius: 8,
              padding: "0 16px",
              fontWeight: 400,
              color: "#0f172a",
              fontSize: 14,
            }}
          />
        </label>

        <label
          style={{
            display: "grid",
            gap: 10,
            fontSize: 15,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Headers{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>
            (Định dạng JSON)
          </span>
          <textarea
            value={config.apiHeaders || ""}
            onChange={(e) =>
              setConfig({ ...config, apiHeaders: e.target.value })
            }
            onBlur={() => handleFormatJson("apiHeaders")}
            placeholder={`{\n  "Authorization": "Bearer ..."\n}`}
            rows={4}
            style={{
              fontFamily: "'Fira Code', monospace",
              width: "100%",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #cbd4df",
              background: "#f8fafc",
              resize: "vertical",
              overflowY: "auto",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#334155",
            }}
          />
        </label>

        <label
          style={{
            display: "grid",
            gap: 10,
            fontSize: 15,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Body{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>
            (Định dạng JSON)
          </span>
          <textarea
            value={config.apiBody || ""}
            onChange={(e) => setConfig({ ...config, apiBody: e.target.value })}
            onBlur={() => handleFormatJson("apiBody")}
            placeholder={`{\n  "sdt": "<sdt here>",\n  "name": "<name here>"\n}`}
            rows={8}
            style={{
              fontFamily: "'Fira Code', monospace",
              width: "100%",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #cbd4df",
              background: "#f8fafc",
              resize: "vertical",
              overflowY: "auto",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#334155",
            }}
          />
        </label>

        <div
          style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }}
        ></div>

        <label
          style={{
            display: "grid",
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          Hoặc Get API{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8" }}>
            (Sử dụng nếu không dùng Post)
          </span>
          <textarea
            value={config.apiGetUrl || ""}
            onChange={(e) =>
              setConfig({ ...config, apiGetUrl: e.target.value })
            }
            onBlur={handleFormatGetUrl}
            placeholder="https://api.smax.ai/...&access_token=..."
            rows={3}
            style={{
              fontFamily: "'Fira Code', monospace",
              width: "100%",
              padding: 16,
              borderRadius: 8,
              border: "1px dashed #cbd4df",
              background: "#f1f5f9",
              resize: "vertical",
              overflowY: "auto",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#475569",
            }}
          />
        </label>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
