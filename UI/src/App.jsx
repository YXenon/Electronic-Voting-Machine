import { useState, useEffect, useRef } from "react";
import {
    Banner,
    Btn,
    Card,
    CardTitle,
    Dot,
    Field,
    Hint,
    Input,
    Pill,
    Row,
    Tag,
    cn,
    twoCol,
} from "./ui";
import "./App.css";

const NUM_BTNS = 5;
const BTN_BG = ["bg-btn-1", "bg-btn-2", "bg-btn-3", "bg-btn-4", "bg-btn-5"];

const zeros = () => Array(NUM_BTNS).fill(0);
const falses = () => Array(NUM_BTNS).fill(false);

function load(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}
function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d) return d + "d " + h + "h";
    if (h) return h + "h " + m + "m";
    if (m) return m + "m " + (s % 60) + "s";
    return s + "s";
}

function clamp(v, min, max, fallback) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

function ConfirmButton({ onConfirm, disabled, children }) {
    const [armed, setArmed] = useState(false);
    useEffect(() => {
        if (!armed) return;
        const t = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(t);
    }, [armed]);
    return (
        <Btn
            tone={armed ? "danger" : "default"}
            disabled={disabled}
            onClick={() => {
                if (armed) {
                    setArmed(false);
                    onConfirm();
                } else setArmed(true);
            }}
        >
            {armed ? "Tap again to confirm" : children}
        </Btn>
    );
}

function ButtonCard({
    i,
    count,
    total,
    locked,
    leader,
    presses,
    admin,
    live,
    onLock,
    onReset,
}) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return (
        <Card
            as="div"
            compact
            highlight={leader}
            className={cn(
                "relative overflow-hidden transition-colors duration-200",
                locked && "opacity-70",
            )}
        >
            {presses > 0 && (
                <span
                    key={presses}
                    className="pointer-events-none absolute inset-0 animate-flash motion-reduce:animate-none"
                />
            )}

            <Row className="justify-between">
                <Row as="span">
                    <Dot color={BTN_BG[i]} />
                    <span>Button {i + 1}</span>
                </Row>
                {locked && <Tag>Locked</Tag>}
            </Row>

            <div className="mt-2.5 text-count font-bold tabular-nums">
                <span
                    key={count}
                    className="inline-block animate-bump motion-reduce:animate-none"
                >
                    {count}
                </span>
            </div>

            <div className="mt-2.5 mb-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                    className={cn(
                        "h-full transition-[width] duration-300",
                        BTN_BG[i],
                    )}
                    style={{ width: pct + "%" }}
                />
            </div>
            <Row className="justify-between text-caption text-muted">
                <span>{pct}% of clicks</span>
                {leader && <span className="text-warn">★ Leading</span>}
            </Row>

            {admin && (
                <Row nowrap className="mt-3">
                    <Btn size="sm" disabled={!live} onClick={onLock}>
                        {locked ? "Unlock" : "Lock"}
                    </Btn>
                    <Btn size="sm" disabled={!live} onClick={onReset}>
                        Reset
                    </Btn>
                </Row>
            )}
        </Card>
    );
}

function Stat({ label, value }) {
    return (
        <div>
            <span className="text-caption text-muted">{label}</span>
            <b className="block text-lg font-semibold tabular-nums">{value}</b>
        </div>
    );
}

function InfoItem({ label, children }) {
    return (
        <div>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="tabular-nums wrap-anywhere">{children}</dd>
        </div>
    );
}

function AdminControls({ live, started, allLocked, send, info }) {
    const [hz, setHz] = useState("3000");
    const [ms, setMs] = useState("1000");

    // Fill the inputs with whatever the device is currently using.
    const infoHz = info && info.beep_hz;
    const infoMs = info && info.beep_ms;
    useEffect(() => {
        if (infoHz != null) setHz(String(infoHz));
        if (infoMs != null) setMs(String(infoMs));
    }, [infoHz, infoMs]);

    const saveBuzzer = () => {
        const h = clamp(hz, 100, 10000, 3000);
        const m = clamp(ms, 0, 5000, 1000);
        setHz(String(h));
        setMs(String(m));
        send({ name: "config", beep_hz: h, beep_ms: m });
        send({ name: "info" });
    };

    return (
        <>
            <Card>
                <CardTitle>Admin Controls</CardTitle>
                <div className={twoCol}>
                    <Btn
                        tone="success"
                        disabled={!live || started}
                        onClick={() => send({ name: "start" })}
                    >
                        Start
                    </Btn>
                    <Btn
                        tone="danger"
                        disabled={!live || !started}
                        onClick={() => send({ name: "stop" })}
                    >
                        Stop
                    </Btn>
                    <Btn
                        disabled={!live}
                        onClick={() =>
                            send({ name: "lock", locked: !allLocked })
                        }
                    >
                        {allLocked ? "Unlock all" : "Lock all"}
                    </Btn>
                    <ConfirmButton
                        disabled={!live}
                        onConfirm={() => send({ name: "reset" })}
                    >
                        Reset all
                    </ConfirmButton>
                </div>
            </Card>

            <Card>
                <CardTitle>Buzzer</CardTitle>
                <div className={twoCol}>
                    <Field label="Frequency (Hz)">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min="100"
                            max="10000"
                            value={hz}
                            onChange={(e) => setHz(e.target.value)}
                        />
                    </Field>
                    <Field label="Duration (ms)">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="5000"
                            value={ms}
                            onChange={(e) => setMs(e.target.value)}
                        />
                    </Field>
                    <Btn
                        disabled={!live}
                        onClick={() =>
                            send({
                                name: "beep",
                                hz: clamp(hz, 100, 10000, 3000),
                                ms: clamp(ms, 0, 5000, 1000) || 200,
                            })
                        }
                    >
                        Test Beep
                    </Btn>
                    <Btn tone="accent" disabled={!live} onClick={saveBuzzer}>
                        Save
                    </Btn>
                </div>
            </Card>
        </>
    );
}


export default function App() {
    const [host, setHost] = useState(() => load("bp_host", "esp32vm.local"));
    const [port, setPort] = useState(() => load("bp_port", "81"));
    const [conn, setConn] = useState("disconnected");

    const [counts, setCounts] = useState(zeros);
    const [locked, setLocked] = useState(falses);
    const [started, setStarted] = useState(false);
    const [clients, setClients] = useState(0);
    const [presses, setPresses] = useState(zeros);
    const [lastButton, setLastButton] = useState(null);
    const [info, setInfo] = useState(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [pw, setPw] = useState("");
    const [authError, setAuthError] = useState("");
    const [message, setMessage] = useState("");

    const wsRef = useRef(null);
    const wantRef = useRef(false);
    const retryRef = useRef(null);
    const pwRef = useRef("");
    const urlRef = useRef("");

    const live = conn === "connected";

    function send(obj) {
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
        console.log("SENDING DATA...");
    }

    function closeSocket() {
        const ws = wsRef.current;
        if (!ws) return;
        ws.onopen = ws.onmessage = ws.onclose = null;
        ws.close();
        wsRef.current = null;
    }

    function handleMessage(msg) {
        switch (msg.name) {
            case "btn_state":
            case "btn_state_update":
                if (msg.state) setCounts(msg.state);
                if (msg.locked) setLocked(msg.locked);
                if (msg.started !== undefined) setStarted(msg.started);
                if (msg.clients !== undefined) setClients(msg.clients);
                if (
                    msg.name === "btn_state_update" &&
                    typeof msg.button === "number"
                ) {
                    setLastButton(msg.button);
                    setPresses((p) =>
                        p.map((n, i) => (i === msg.button ? n + 1 : n)),
                    );
                }
                break;
            case "status_update":
                setStarted(!!msg.started);
                break;
            case "status":
                if (msg.cmd === "login") {
                    setIsAdmin(true);
                    setAuthError("");
                }
                break;
            case "error":
                if (msg.error === "bad password") {
                    pwRef.current = "";
                    setAuthError("Wrong password");
                } else {
                    if (msg.error === "unauthorized") setIsAdmin(false);
                    setMessage(msg.error || "Device error");
                }
                break;
            case "info":
                setInfo(msg);
                if (msg.clients !== undefined) setClients(msg.clients);
                break;
            default:
                break;
        }
    }

    function openSocket() {
        clearTimeout(retryRef.current);
        closeSocket();
        setConn("connecting");

        let ws;
        try {
            ws = new WebSocket(urlRef.current);
        } catch {
            wantRef.current = false;
            setConn("disconnected");
            setMessage("Invalid address");
            return;
        }
        wsRef.current = ws;

        ws.onopen = () => {
            setConn("connected");
            if (pwRef.current) send({ name: "login", password: pwRef.current });
            send({ name: "info" });
        };
        ws.onmessage = (e) => {
            try {
                handleMessage(JSON.parse(e.data));
            } catch {}
        };
        ws.onclose = () => {
            setIsAdmin(false);
            if (wantRef.current) {
                setConn("connecting");
                retryRef.current = setTimeout(openSocket, 2000);
            } else {
                setConn("disconnected");
            }
        };
    }

    function connect() {
        const clean = host
            .trim()
            .replace(/^(wss?|https?):\/\//, "")
            .replace(/\/.*$/, "");
        if (!clean) return;
        const p = port || "81";
        setHost(clean);
        save("bp_host", clean);
        save("bp_port", p);
        wantRef.current = true;
        urlRef.current = "ws://" + clean + ":" + p;
        openSocket();
    }

    function disconnect() {
        wantRef.current = false;
        pwRef.current = "";
        clearTimeout(retryRef.current);
        closeSocket();
        setConn("disconnected");
        setIsAdmin(false);
    }

    function logout() {
        pwRef.current = "";
        setIsAdmin(false);
        if (wantRef.current) openSocket();
    }

    function login(e) {
        e.preventDefault();
        if (!pw || !live) return;
        pwRef.current = pw;
        setAuthError("");
        send({ name: "login", password: pw });
    }

    useEffect(() => {
        connect(); // auto-connect on load
        return () => {
            wantRef.current = false;
            clearTimeout(retryRef.current);
            closeSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isAdmin) {
            setShowLogin(false);
            setPw("");
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(""), 4000);
        return () => clearTimeout(t);
    }, [message]);

    const total = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(...counts);
    const allLocked = locked.every(Boolean);

    const dotTone =
        conn === "connected" ? "on" : conn === "connecting" ? "wait" : "";
    const connLabel = {
        connected: "Connected",
        connecting: "Connecting…",
        disconnected: "Disconnected",
    }[conn];

    return (
        <div className="min-h-dvh bg-surface font-sans leading-[1.4] text-ink">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 p-safe">
                <Row
                    as="header"
                    className={"flex items-center justify-between"}
                >
                    <Pill tone={isAdmin ? "admin" : "default"}>
                        {isAdmin ? "Admin" : "Viewer"}
                    </Pill>
                    {isAdmin ? (
                        <Btn onClick={logout}>Log Out</Btn>
                    ) : (
                        <Btn
                            tone="accent"
                            aria-label="Admin login"
                            onClick={() => {
                                setAuthError("");
                                setShowLogin(true);
                            }}
                            disabled={!live}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                className="fill-current"
                                aria-hidden="true"
                            >
                                <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5M9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9zm4 10.723V20h-2v-2.277a1.993 1.993 0 0 1 .567-3.677A2 2 0 0 1 14 16a1.99 1.99 0 0 1-1 1.723"></path>
                            </svg>
                        </Btn>
                    )}
                </Row>

                {message && (
                    <Banner tone="error" role="alert">
                        {message}
                    </Banner>
                )}

                {showLogin && !isAdmin && (
                    <Card
                        as="form"
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={login}
                    >
                        <Field
                            label="Admin Password"
                            className="flex-[1_1_12rem]"
                        >
                            <Input
                                type="password"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                autoComplete="off"
                                autoFocus
                            />
                        </Field>
                        <Btn
                            tone="accent"
                            type="submit"
                            disabled={!pw || !live}
                        >
                            Log In
                        </Btn>
                        <Btn onClick={() => setShowLogin(false)}>Cancel</Btn>
                        {authError && (
                            <p className="flex-[1_1_100%] text-sm text-rose-400">
                                {authError}
                            </p>
                        )}
                    </Card>
                )}

                {/* connection */}
                <Card>
                    <div className="flex w-full items-center pb-4 mb-4 gap-1.5 border-b border-b-dim">
                        <Dot tone={dotTone} />
                        {connLabel}
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <Field
                            label="Device Address"
                            className="flex-[1_1_12rem]"
                        >
                            <Input
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") connect();
                                }}
                                placeholder="esp32vm.local or 192.168.x.x"
                                inputMode="url"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                disabled={conn == "connecting"}
                            />
                        </Field>
                        <Field label="Port" className="flex-[0_0_6rem]">
                            <Input
                                value={port}
                                inputMode="numeric"
                                onChange={(e) =>
                                    setPort(e.target.value.replace(/\D/g, ""))
                                }
                                disabled={conn == "connecting"}
                            />
                        </Field>
                        <Btn
                            tone={conn === "disconnected" ? "accent" : "default"}
                            className="flex justify-center items-center gap-2 flex-[1_1_6rem] uppercase"
                            onClick={() => {
                                conn == "disconnected"
                                    ? connect()
                                    : disconnect();
                            }}
                        >
                            {conn == "disconnected" ? (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width={20}
                                        height={20}
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 7q-2.2 0-4.288.688T3.875 9.724q-.5.4-1.137.388T1.65 9.65q-.425-.425-.425-1.05t.5-1q2.2-1.75 4.838-2.675T12 4q2.825 0 5.45.925T22.275 7.6q.5.375.5 1t-.425 1.05q-.45.45-1.088.463t-1.137-.388q-1.75-1.35-3.825-2.037T12 7m0 6q-1.025 0-1.987.263t-1.838.787q-.55.35-1.187.325T5.9 13.9q-.425-.425-.413-1.037T6 11.9q1.325-.925 2.85-1.412T12 10t3.15.488T18 11.9q.5.35.513.963T18.1 13.9q-.45.45-1.088.475t-1.187-.325q-.875-.525-1.837-.788T12 13m-1.412 6.413Q10 18.825 10 18t.588-1.412T12 16t1.413.588T14 18t-.587 1.413T12 20t-1.412-.587"></path>
                                    </svg>
                                    Connect
                                </>
                            ) : (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width={20}
                                        height={20}
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            className="fill-ink"
                                            d="M10.588 19.413Q10 18.825 10 18t.588-1.412T12 16t1.413.588T14 18t-.587 1.413T12 20t-1.412-.587M7.55 11L4.8 9.075q-.25.15-.475.313t-.45.337q-.5.4-1.137.388T1.65 9.65q-.425-.425-.425-1.05t.5-1q.125-.1.238-.175T2.2 7.25l-.45-.3q-.425-.3-.512-.8t.212-.925t.813-.525t.937.2l17.6 12.35q.425.3.525.8t-.2.925t-.812.513t-.938-.213l-8.775-6.15q-.65.125-1.262.363t-1.188.587q-.55.35-1.175.313T5.9 13.9q-.425-.425-.413-1.037T6 11.9q.375-.275.763-.488T7.55 11m3.075-3.925L7.25 4.7q1.15-.35 2.338-.525T12 4q2.825 0 5.45.925T22.275 7.6q.5.375.5 1t-.425 1.05q-.45.45-1.088.463t-1.137-.388q-1.75-1.35-3.825-2.037T12 7q-.35 0-.687.013t-.688.062"
                                        ></path>
                                    </svg>
                                    Disconnect
                                </>
                            )}
                        </Btn>
                    </div>
                </Card>

                <div
                    className={cn(
                        "flex flex-col gap-3 transition-opacity duration-200",
                        !live && "opacity-50",
                    )}
                >
                    {/* status */}
                    <Card className="flex flex-wrap items-center justify-between gap-4">
                        <Row>
                            <Dot
                                big
                                tone={started ? "on" : "idle"}
                                pulse={started && live}
                            />
                            <div>
                                <div className="text-xl font-semibold">
                                    {started ? "Running" : "Stopped"}
                                </div>
                                <div className="text-caption text-muted">
                                    {lastButton !== null
                                        ? "Last press: Button " +
                                          (lastButton + 1)
                                        : "No presses seen yet"}
                                </div>
                            </div>
                        </Row>
                        <div className="flex gap-8">
                            <Stat label="Total clicks" value={total} />
                            <Stat label="Clients" value={clients} />
                        </div>
                    </Card>

                    {/* buttons */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 wide:grid-cols-5 max-sm:[&>:last-child:nth-child(odd)]:col-span-full">
                        {counts.map((count, i) => (
                            <ButtonCard
                                key={i}
                                i={i}
                                count={count}
                                total={total}
                                locked={!!locked[i]}
                                leader={count > 0 && count === max}
                                presses={presses[i] || 0}
                                admin={isAdmin}
                                live={live}
                                onLock={() =>
                                    send({
                                        name: "lock",
                                        button: i,
                                        locked: !locked[i],
                                    })
                                }
                                onReset={() =>
                                    send({ name: "reset", button: i })
                                }
                            />
                        ))}
                    </div>
                {/* </div> */}

                {/* <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3"> */}
                    {isAdmin && (
                        <AdminControls
                            live={live}
                            started={started}
                            allLocked={allLocked}
                            send={send}
                            info={info}
                        />
                    )}

                    <Card>
                        <CardTitle>Device</CardTitle>
                        {info ? (
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
                                <InfoItem label="IP">{info.ip}</InfoItem>
                                <InfoItem label="Signal">
                                    {info.rssi} dBm
                                </InfoItem>
                                <InfoItem label="Free memory">
                                    {Math.round(info.heap / 1024)} KB
                                </InfoItem>
                                <InfoItem label="Uptime">
                                    {formatUptime(info.uptime_ms)}
                                </InfoItem>
                            </dl>
                        ) : (
                            <p className="text-caption text-muted">
                                No device info yet.
                            </p>
                        )}
                        <div className={cn(twoCol, "mt-3")}>
                            <Btn
                                disabled={!live}
                                onClick={() => send({ name: "info" })}
                                className={cn(!isAdmin && "col-span-2")}
                            >
                                Refresh Info
                            </Btn>
                            {isAdmin && (
                                <ConfirmButton
                                    disabled={!live}
                                    onConfirm={() => send({ name: "reboot" })}
                                >
                                    Reboot
                                </ConfirmButton>
                            )}
                        </div>
                        {isAdmin && (
                            <Hint>
                                Reboot restarts the ESP32. This page reconnects
                                on its own.
                            </Hint>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
