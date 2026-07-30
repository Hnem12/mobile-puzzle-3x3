import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, ChevronLeft, Download, Pause, Play, RotateCcw, Upload, X, Zap, User, Phone, MapPin, Store, Scan } from "lucide-react";
import racingBg from "./assets/Background.png";
import logoMove from "./assets/logo-move.png";
import logoKingsport from "./assets/logo-kingsport.png";
import imgTop1 from "./assets/top1.png";
import imgTop2 from "./assets/top2.png";
import imgTop3 from "./assets/top3.png";
import formBg from "./assets/form-bg.png";
import "./styles.css";
import QRCode from "react-qr-code";

const rawApi = import.meta.env.VITE_API_URL;
const API = rawApi 
  ? (rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`) 
  : `http://${window.location.hostname}:4000/api`;
type Level = { _id: string; name: string; timeLimit: number; maxScore: number; quickWinSeconds: number; scoreRules: { withinSeconds: number; score: number }[] };
type GameImage = { _id: string; name: string; imageUrl: string; status: "ACTIVE" | "INACTIVE"; gridSize: number; createdAt: string };
type Bootstrap = { settings: any; levels: Level[]; images?: GameImage[]; image?: GameImage | null };
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` });
function App() {
  return <div style={{ "--racing-bg": `url(${racingBg})` } as React.CSSProperties}>{location.pathname.startsWith("/admin") ? <Admin /> : <Game />}</div>;
}

function Game() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [image, setImage] = useState<GameImage | null>(null);
  const [user, setUser] = useState<any>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState(!new URLSearchParams(window.location.search).has("play"));
  const [bootError, setBootError] = useState("");
  useEffect(() => {
    fetch(`${API}/game/bootstrap`)
      .then(r => { if (!r.ok) throw new Error("Cannot load game data"); return r.json(); })
      .then(b => {
        const imgs = b.images && b.images.length > 0 ? b.images : (b.image ? [b.image] : []);
        setImage(imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)] : null);
        if (b.levels) {
          const order: any = { "Easy": 1 };
          b.levels.sort((a: Level, b: Level) => (order[a.name] || 99) - (order[b.name] || 99));
        }
        setBoot(b);
      })
      .catch(() => setBootError("Không kết nối được backend. Vui lòng kiểm tra server Mongo/API."));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) { e.preventDefault(); e.returnValue = ""; }
    };
    const handlePopState = () => {
      if (user) {
        if (!window.confirm("Bạn có chắc chắn muốn thoát khỏi trò chơi? Tiến trình hiện tại sẽ không được lưu.")) {
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
      if (!window.history.state?.trapped) window.history.pushState({ trapped: true }, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  if (bootError) return <main className="game-hero"><section className="phone-panel"><h1>Lỗi kết nối</h1><p>{bootError}</p></section></main>;
  if (!boot) return <main className="game-hero"><section className="phone-panel"><h1>Đang tải...</h1></section></main>;
  if (!boot.levels || boot.levels.length === 0) return <main className="game-hero"><section className="phone-panel"><h1>Chưa cấu hình Game</h1><p>Vui lòng chạy lệnh cài đặt dữ liệu (seed) hoặc cấu hình mức độ chơi trong trang Admin để bắt đầu.</p></section></main>;

  const activeLevel = boot.levels[0];

  if (result) return <Result result={result} level={activeLevel} onReplay={() => setResult(null)} onLeaderboard={() => setLeaderboard(true)} onLogout={() => setUser(null)} />;
  if (!user) return <Register onDone={u => setUser(u)} disabled={!boot.settings.gameStatus} />;
  return <Puzzle user={user} level={activeLevel} image={image} onDone={setResult} onLogout={() => setUser(null)} />;
}

function Register({ onDone, disabled }: { onDone: (u: any) => void; disabled: boolean }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] = useState<"retail" | "agency">("retail");
  const [productOfInterest, setProductOfInterest] = useState<"move" | "kingsport">("move");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/game/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone, address, customerType, productOfInterest }) });
      const data = await res.json().catch(() => ({}));
      res.ok ? onDone(data) : setError(data.message || "Không thể đăng ký");
    } catch {
      setError("Không kết nối được backend, chưa thể lưu người chơi");
    }
  }
  return <main className="game-hero puzzle-hero"><section className="phone-panel">
    <BrandHeader />
    <h1>Đăng ký tham gia</h1>
    <form onSubmit={submit} className="game-card stack red-glow">
      <label><span className="label-with-icon"><User size={14} /> HỌ VÀ TÊN *</span><input required placeholder="Nhập họ và tên..." value={fullName} onChange={e => setFullName(e.target.value)} /></label>
      <label><span className="label-with-icon"><Phone size={14} /> SỐ ĐIỆN THOẠI *</span><input required type="tel" pattern="[0-9]{10}" maxLength={10} title="Số điện thoại phải gồm đúng 10 chữ số" placeholder="Nhập số điện thoại..." value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} /></label>
      <label><span className="label-with-icon"><MapPin size={14} /> ĐỊA CHỈ</span><input placeholder="Nhập địa chỉ hiện tại..." value={address} onChange={e => setAddress(e.target.value)} /></label>
      
      <div className="radio-group-label">NHU CẦU MUA SẮM</div>
      <div className="radio-group">
        <button type="button" className={customerType === "retail" ? "active" : ""} onClick={() => setCustomerType("retail")}><User size={14} /> Khách hàng mua lẻ</button>
        <button type="button" className={customerType === "agency" ? "active" : ""} onClick={() => setCustomerType("agency")}><Store size={14} /> Khách hàng đại lý</button>
      </div>

      <div className="radio-group-label">SẢN PHẨM QUAN TÂM</div>
      <div className="radio-group">
        <button type="button" className={productOfInterest === "move" ? "active" : ""} onClick={() => setProductOfInterest("move")}>Xe điện MOVE</button>
        <button type="button" className={productOfInterest === "kingsport" ? "active" : ""} onClick={() => setProductOfInterest("kingsport")}>Kingsport</button>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="primary-red" disabled={disabled}>Bắt đầu chơi ngay</button>
      <p className="privacy-note">Thông tin này chỉ được sử dụng với mục đích ghi nhận quà tặng sau trò chơi</p>
    </form>
  </section></main>;
}

function Puzzle({ user, level, image, onDone, onLogout }: { user: any; level: Level; image: GameImage | null; onDone: (r: any) => void; onLogout: () => void }) {
  const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const [tiles, setTiles] = useState<number[]>(() => shuffleSolvable(solved));
  const [moves, setMoves] = useState(0);
  const [left, setLeft] = useState(level.timeLimit);
  const [finished, setFinished] = useState(false);
  const done = tiles.join() === solved.join();
  useEffect(() => {
    if (finished) return;
    if (done) { void finish("WIN"); return; }
    if (left <= 0) { void finish("LOSE"); return; }
    const t = setTimeout(() => setLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, done, finished]);
  async function finish(result: "WIN" | "LOSE") {
    setFinished(true);
    const duration = level.timeLimit - Math.max(left, 0);
    const score = result === "WIN" ? calcScore(level, duration, moves) : 0;
    try {
      const res = await fetch(`${API}/game/histories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user._id, levelId: level._id, result, score, duration, moves }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Cannot save history");
      }
      onDone({ result, score, duration, moves, user });
    } catch {
      alert("Không lưu được lịch sử chơi vào backend. Vui lòng thử lại hoặc kiểm tra API/Mongo.");
      setFinished(false);
    }
  }
  function move(i: number) {
    const blank = tiles.indexOf(0);
    if (![i - 1, i + 1, i - 3, i + 3].includes(blank) || Math.abs((i % 3) - (blank % 3)) > 1) return;
    const next = [...tiles];
    [next[i], next[blank]] = [next[blank], next[i]];
    setTiles(next); setMoves(m => m + 1);
  }
  return <main className="play-screen" style={{ "--racing-bg": `url(${formBg})` } as React.CSSProperties}>
    <button type="button" onClick={onLogout} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', zIndex: 10 }}>Đổi người chơi</button>
    <BrandHeader />
    <header><strong>Ảnh mẫu</strong><span>{left.toFixed(2)}s</span></header>
    <div className="progress"><i style={{ width: `${(left / level.timeLimit) * 100}%` }} /></div>
    <div className="play-meta"><span>Điểm: {calcScore(level, level.timeLimit - left, moves)}</span><span>{moves} bước</span></div>
    {image && <img className="sample" src={image.imageUrl} alt="Mẫu" />}
    <section className="board">{tiles.map((tile, i) => <button key={i} className={tile ? "tile" : "blank"} onClick={() => move(i)} style={tile ? tileStyle(tile, image?.imageUrl) : {}} />)}</section>
    <button className="primary-red" disabled={!done} onClick={() => finish("WIN")}>Hoàn tất quà</button>
  </main>;
}

function Result({ result, level, onReplay, onLeaderboard, onLogout }: { result: any; level: Level; onReplay: () => void; onLeaderboard: () => void; onLogout: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { 
    fetch(`${API}/game/leaderboard`)
      .then(r => { 
        if (!r.ok) throw new Error("Cannot load leaderboard"); 
        return r.json(); 
      })
      .then((data: any[]) => {
        const levelPriority: Record<string, number> = {
          Easy: 1
        };

        const sorted = [...data].sort((a, b) => {
          const aLevel = a.levelName || a.levelId?.name || "Easy";
          const bLevel = b.levelName || b.levelId?.name || "Easy";
          
          const levelDiff = (levelPriority[bLevel] || 0) - (levelPriority[aLevel] || 0);
          if (levelDiff !== 0) return levelDiff;
          
          const aScore = a.bestScore ?? 0;
          const bScore = b.bestScore ?? 0;
          if (bScore !== aScore) {
            return bScore - aScore;
          }

          return (a.bestDuration ?? 0) - (b.bestDuration ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([])); 
  }, []);
  const fallbackCurrent = result.user ? { fullName: result.user.fullName, phone: result.user.phone, bestDuration: result.duration, score: result.score } : null;
  const rankedRows = rows.length ? rows : fallbackCurrent ? [fallbackCurrent] : [];
  const podium = [rankedRows[1], rankedRows[0], rankedRows[2]];
  const podiumLabels = ["TOP 2", "TOP 1", "TOP 3"];
  const currentIndex = result.user?.phone ? rankedRows.findIndex(row => row.phone === result.user.phone) : -1;
  const currentRank = currentIndex >= 0 ? currentIndex + 1 : null;
  const rest = rankedRows.slice(3, 5);
  return <main className="game-hero result-hero"><section className="phone-panel result">
    <button type="button" onClick={onLogout} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', zIndex: 10 }}>Đổi người chơi</button>
    <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <BrandHeader />
    <h1>{result.result === "WIN" ? "HOÀN THÀNH THỬ THÁCH" : "HẾT THỜI GIAN"}</h1>
    <p className="muted-label">Thời gian của bạn</p>
    <strong className="time-result">{formatTime(result.duration)}</strong>
    <b className="winner-copy">Thật tuyệt vời</b>
    <p className="result-copy">{currentRank ? currentRank <= 3 ? <>Bạn đang ở <b>Top {currentRank}</b>.</> : <>Bạn đang ở <b>hạng {currentRank}</b> chế độ <b>{level.name}</b>.</> : <>Kết quả của bạn đã được ghi nhận và BXH đang cập nhật.</>} Liên tục cập nhật BXH để theo dõi cơ hội nhận <b>01 chiếc xe máy điện Athena.</b></p>
    
    <div className="top-board">{podium.map((row, i) => <article className={`top-card top-${i + 1}`} key={podiumLabels[i]}>
      <div className="prize-orb"><img src={[imgTop2, imgTop1, imgTop3][i]} alt={podiumLabels[i]} /></div>
      <strong className="rank-label">{podiumLabels[i]}</strong>
      <b>{row?.fullName || "Chưa có dữ liệu"}</b>
      <time>{formatTime(row?.bestDuration)}</time>
    </article>)}</div>
    <div className="rank-list compact">
      {rest.length ? rest.map((row, i) => <p key={row.phone || i}><span>{String(i + 4).padStart(2, "0")}</span><strong>{row.fullName}</strong><b>{formatTime(row.bestDuration)}</b></p>) : <p><span>{currentIndex >= 0 ? String(currentIndex + 1).padStart(2, "0") : "--"}</span><strong>{result.user?.fullName || "Bạn"}</strong><b>{formatTime(result.duration)}</b></p>}
    </div>
    <button className="primary-red notify" onClick={onLeaderboard}><Bell size={16} /> THEO DÕI BẢNG XẾP HẠNG QUA ZALO NGAY</button>
  </section></main>;
}
function Leaderboard({ levels, onBack }: { levels: Level[]; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  
  useEffect(() => { 
    fetch(`${API}/game/leaderboard`)
      .then(r => { 
        if (!r.ok) throw new Error("Cannot load leaderboard"); 
        return r.json(); 
      })
      .then((data: any[]) => {
        const levelPriority: Record<string, number> = {
 
          Easy: 1
        };

        const sorted = [...data].sort((a, b) => {
          const aLevel = a.levelName || a.levelId?.name || "Easy";
          const bLevel = b.levelName || b.levelId?.name || "Easy";
          
          const levelDiff = (levelPriority[bLevel] || 0) - (levelPriority[aLevel] || 0);
          if (levelDiff !== 0) return levelDiff;
          
          const aScore = a.bestScore ?? 0;
          const bScore = b.bestScore ?? 0;
          if (bScore !== aScore) {
            return bScore - aScore;
          }

          return (a.bestDuration ?? 0) - (b.bestDuration ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([])); 
  }, []);

  const podium = [rows[1], rows[0], rows[2]];
  const podiumLabels = ["TOP 2", "TOP 1", "TOP 3"];
  const rest = rows.slice(3);

  return <main className="game-hero leaderboard-screen"><section className="leaderboard-panel">
    <button className="icon-back" onClick={onBack} aria-label="Quay lại"><ChevronLeft size={18} /></button>
    <BrandHeader />
    <div className="leaderboard-header-title">
      <h1><span className="bolt"><Zap size={22} fill="currentColor" /></span> Move to be king</h1>
      <p className="subtitle">The faster hand</p>
    </div>
    <div className="top-board">{podium.map((row, i) => <article className={`top-card top-${i + 1}`} key={podiumLabels[i]}>
      <div className="prize-orb"><img src={[imgTop2, imgTop1, imgTop3][i]} alt={podiumLabels[i]} /></div>
      <strong className="rank-label">{podiumLabels[i]}</strong>
      <b>{row?.fullName || "Đang chờ"}</b>
      <time>{formatTime(row?.bestDuration)}</time>
    </article>)}</div>
    <div className="rank-list compact">{rest.length ? rest.map((r, i) => <p key={r.phone || i}><span>{String(i + 4).padStart(2, "0")}</span><strong>{r.fullName}</strong><b>{formatTime(r.bestDuration)}</b></p>) : <p><span>04</span><strong>Chưa có thêm người chơi</strong><b>--</b></p>}</div>
    <div className="reward-grid">
      <article className="rules-box game-card stack">
        <h2>THỂ LỆ QUÀ TẶNG</h2>
        <p>Người chơi phá kỷ lục Top 3 tại thời điểm tham gia sẽ nhận ngay quà tặng độc quyền từ thương hiệu.<br/>Kết thúc chương trình, Top 3 chung cuộc trên bảng xếp hạng sẽ nhận:</p>
        <ul className="prize-list">
          <li><span className="rank-1">#1:</span> 01 xe máy điện MOVE Athena</li>
          <li><span className="rank-2">#2:</span> 01 máy massage cầm tay Kingsport</li>
          <li><span className="rank-3">#3:</span> 01 máy massage cầm tay Kingsport</li>
        </ul>
      </article>
      <aside className="qr-box game-card stack" style={{ alignItems: "center" }}>
        <div style={{ background: "#fff", padding: "8px", borderRadius: "8px", display: "inline-block" }}>
          <QRCode value="https://mobile-puzzle-3x3.pages.dev/?play=1" size={120} />
        </div>
        <b style={{ textAlign: "center" }}>Quét QR tham gia đường<br/>đua ngay</b>
        {window.location.hostname === "localhost" && <small style={{ color: "red", textAlign: "center", fontSize: "12px", marginTop: "4px" }}>Vui lòng mở web bằng IP LAN (vd: 192.168.x.x) để ĐT có thể quét được!</small>}
      </aside>
    </div>
  </section></main>;
}

function formatSeconds(value: unknown) {
  return typeof value === "number" ? `${value.toFixed(2)}s` : "--";
}
function formatTime(value: unknown) {
  return typeof value === "number" ? `00:${value.toFixed(2).padStart(5, "0")}` : "--";
}
function maskPhone(value: unknown) {
  const phone = String(value || "");
  return phone.length >= 6 ? `${phone.slice(0, 3)}***${phone.slice(-3)}` : "";
}

function BrandHeader() {
  return <div className="brand-row"><img src={logoMove} alt="Move" className="brand-logo move-logo" /><X size={10} strokeWidth={3} color="#fff" className="brand-cross" /><img src={logoKingsport} alt="Kingsport" className="brand-logo kingsport-logo" /></div>;
}

function Admin() {
  const [token, setToken] = useState(localStorage.getItem("adminToken"));
  const [tab, setTab] = useState("images");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
  };

  if (!token) return <Login onDone={setToken} />;
  return <main className="admin">
    <nav className="admin-nav">
      <button className={tab === "images" ? "active" : ""} onClick={() => setTab("images")}>Hình ảnh</button>
      <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Lịch sử chơi</button>
      <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Cấu hình Game</button>
      <button onClick={handleLogout} style={{ marginLeft: "auto", background: "transparent", color: "inherit", border: "1px solid rgba(255,255,255,0.2)" }}>Đăng xuất</button>
    </nav>
    {tab === "images" && <Images />}
    {tab === "history" && <History />}
    {tab === "settings" && <Settings />}
  </main>;
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
      const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }); 
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
        <p className="login-subtitle">Vui lòng đăng nhập để truy cập trang quản trị</p>
        
        <form className="stack" onSubmit={login}>
          <label className="login-label">
            Tên đăng nhập
            <input 
              required
              placeholder="Nhập tên đăng nhập..." 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </label>
          <label className="login-label">
            Mật khẩu
            <input 
              required
              type="password" 
              placeholder="Nhập mật khẩu..." 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
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
  const [images, setImages] = useState<GameImage[]>([]); const [file, setFile] = useState<File | null>(null);
  const load = () => fetch(`${API}/admin/images`, { headers: auth() }).then(r => {
    if (r.status === 401) { localStorage.removeItem("adminToken"); window.location.reload(); return []; }
    return r.ok ? r.json() : [];
  }).then(data => setImages(Array.isArray(data) ? data : []));
  useEffect(() => { void load(); }, []);
  async function upload() { if (!file) return; const f = new FormData(); f.append("image", file); f.append("name", file.name); f.append("gridSize", "3"); await fetch(`${API}/admin/images`, { method: "POST", headers: auth(), body: f }); setFile(null); load(); }
  return <section><h1>Hình ảnh</h1><div className="admin-card compact-upload"><h3>Upload ảnh mới</h3><div className="upload-row"><label className="file-label"><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{display: "none"}} /><span className="file-name">{file ? file.name : "Nhấn để chọn ảnh từ máy..."}</span></label><button onClick={upload} disabled={!file} className={file ? "btn-upload-ready" : ""}><Upload size={16} /> Tải lên</button></div></div><table><thead><tr><th>Xem trước</th><th>Lưới</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>{images.map(img => <tr key={img._id}><td><img className="thumb" src={img.imageUrl} /></td><td><span className="pill">3x3</span></td><td><span className={img.status === "ACTIVE" ? "ok" : "bad"}>{img.status === "ACTIVE" ? "Hoạt động" : "Tạm dừng"}</span></td><td>{img.createdAt?.slice(0, 10)}</td><td><div className="action-buttons"><button className={img.status === "ACTIVE" ? "warning" : "ok"} onClick={() => fetch(`${API}/admin/images/${img._id}/status`, { method: "PATCH", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ status: img.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }) }).then(load)}>{img.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}</button><button className="danger" onClick={() => fetch(`${API}/admin/images/${img._id}`, { method: "DELETE", headers: auth() }).then(load)}>Xóa</button></div></td></tr>)}</tbody></table></section>;
}

function History() {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState("");
  useEffect(() => { 
    fetch(`${API}/admin/histories?name=${q}`, { headers: auth() })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem("adminToken"); window.location.reload(); return []; }
        if (!r.ok) throw new Error("Cannot load histories"); return r.json(); 
      })
      .then(data => {
        if (!Array.isArray(data)) return setRows([]);
        
        const levelPriority: Record<string, number> = {
          Easy: 1
        };

        const sorted = [...data].sort((a, b) => {
          if (a.result !== b.result) {
            return a.result === "WIN" ? -1 : 1;
          }

          const aLevel = a.levelName || a.levelId?.name || "Easy";
          const bLevel = b.levelName || b.levelId?.name || "Easy";
          
          const levelDiff = (levelPriority[bLevel] || 0) - (levelPriority[aLevel] || 0);
          if (levelDiff !== 0) return levelDiff;
          
          const aScore = a.score ?? a.bestScore ?? 0;
          const bScore = b.score ?? b.bestScore ?? 0;
          if (bScore !== aScore) {
            return bScore - aScore;
          }

          return (a.duration ?? a.bestDuration ?? 0) - (b.duration ?? b.bestDuration ?? 0);
        });

        setRows(sorted);
      })
      .catch(() => setRows([])); 
  }, [q]);
  async function exportExcel() {
    const res = await fetch(`${API}/admin/histories/export?name=${q}`, { headers: auth() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "game-histories.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }
  return <section><h1>Lịch sử chơi</h1><div className="filters"><input placeholder="Tìm tên..." value={q} onChange={e => setQ(e.target.value)} /><button type="button" onClick={exportExcel}><Download size={18} /> Xuất Excel</button></div><p>Tổng: <b>{rows.length}</b> bản ghi</p><table><thead><tr><th>Người dùng</th><th>Số điện thoại</th><th>Cấp</th><th>Kết quả</th><th>Điểm</th><th>Thời gian (s)</th><th>Bước</th><th>Ngày chơi</th></tr></thead><tbody>{rows.map(r => <tr key={r._id}><td>{r.userId?.fullName}</td><td>{r.userId?.phone}</td><td>{r.levelId?.name}</td><td><span className={r.result === "WIN" ? "ok" : "bad"}>{r.result}</span></td><td>{r.score}</td><td>{r.duration}</td><td>{r.moves}</td><td>{r.playedAt?.slice(0, 10)}</td></tr>)}</tbody></table></section>;
}
function Settings() {
  const [levels, setLevels] = useState<Level[]>([]);
  const load = () => fetch(`${API}/admin/levels`, { headers: auth() }).then(r => {
    if (r.status === 401) { localStorage.removeItem("adminToken"); window.location.reload(); return []; }
    return r.ok ? r.json() : [];
  }).then(data => setLevels(Array.isArray(data) ? data : []));
  
  useEffect(() => { load(); }, []);
  
  function patch(i: number, data: Partial<Level>) { setLevels(v => v.map((l, ix) => ix === i ? { ...l, ...data } : l)); }
  
  async function saveLevel(i: number) {
    const current = levels[i];
    await fetch(`${API}/admin/levels/${current._id}`, { method: "PUT", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify(current) });
    alert(`Lưu cấu hình thành công!`);
  }

  async function createDefaultLevel() {
    await fetch(`${API}/admin/levels`, { method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ name: "Easy", timeLimit: 90, maxScore: 2000, quickWinSeconds: 45, scoreRules: [{ withinSeconds: 44, score: 2000 }, { withinSeconds: 54, score: 1500 }, { withinSeconds: 74, score: 1000 }] }) });
    alert(`Đã khởi tạo dữ liệu mặc định!`);
    load();
  }
  
  return <section>
    <h1>Cấu hình Game</h1>
    {levels.length === 0 ? (
      <div className="admin-card" style={{textAlign: "center", padding: 40}}>
        <h3>Chưa có cấu hình nào</h3>
        <p>Database hiện tại đang trống. Vui lòng khởi tạo cấu hình mặc định để Game có thể hoạt động.</p>
        <button onClick={createDefaultLevel} className="primary-red" style={{marginTop: 15}}>Khởi tạo Cấu hình Mặc định</button>
      </div>
    ) : (
      <div className="level-grid">{levels.map((l, i) => <article className="config-card" key={l._id}><h3>Mức độ mặc định <span>3x3</span></h3><label>Thời gian (giây)<input type="number" value={l.timeLimit} onChange={e => patch(i, { timeLimit: +e.target.value })} /></label><label>Điểm tối đa<input type="number" value={l.maxScore} onChange={e => patch(i, { maxScore: +e.target.value })} /></label><button onClick={() => saveLevel(i)}>Lưu cấu hình</button></article>)}</div>
    )}
  </section>;
}

function shuffleSolvable(solved: number[]): number[] {
  const arr = [...solved];
  for (let n = 0; n < 80; n++) {
    const blank = arr.indexOf(0);
    const moves = [blank - 1, blank + 1, blank - 3, blank + 3].filter(i => i >= 0 && i < 9 && Math.abs((i % 3) - (blank % 3)) <= 1);
    const pick = moves[Math.floor(Math.random() * moves.length)];
    [arr[blank], arr[pick]] = [arr[pick], arr[blank]];
  }
  return arr.join() === solved.join() ? shuffleSolvable(solved) : arr;
}
function tileStyle(tile: number, url?: string): React.CSSProperties {
  const x = (tile - 1) % 3, y = Math.floor((tile - 1) / 3);
  return { backgroundImage: `url(${url})`, backgroundSize: "300% 300%", backgroundPosition: `${x * 50}% ${y * 50}%` };
}
function calcScore(level: Level, duration: number, moves: number) {
  const rule = [...level.scoreRules].sort((a, b) => a.withinSeconds - b.withinSeconds).find(r => duration <= r.withinSeconds);
  return Math.max(100, (rule?.score || Math.round(level.maxScore * 0.5)) - moves * 10);
}

createRoot(document.getElementById("root")!).render(<App />);

















