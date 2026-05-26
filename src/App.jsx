// Re-export the implemented App component from App.js
import React, { useEffect, useState } from "react";
import { plan } from "./planData";
import "./App.css";

// HMR trigger log
console.log(' App: HMR ping');

const STORAGE_KEY = "plan-progress";
const TIMER_STORAGE_KEY = "plan-study-timer";
const NOTES_STORAGE_KEY = "plan-study-notes";
const CODE_NOTES_STORAGE_KEY = "plan-study-code-notes";
const EMPTY_TIMER = { elapsedMs: 0, isRunning: false, startedAt: null };

function normalizeTimer(timer) {
	if (!timer || typeof timer !== "object") return { ...EMPTY_TIMER };

	return {
		elapsedMs: Number(timer.elapsedMs) || 0,
		isRunning: Boolean(timer.isRunning),
		startedAt: timer.startedAt ? Number(timer.startedAt) : null,
	};
}

function loadTimers() {
	try {
		const raw = localStorage.getItem(TIMER_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return {};

		return Object.fromEntries(
			Object.entries(parsed).map(([dayKey, timer]) => [dayKey, normalizeTimer(timer)]),
		);
	} catch (e) {
		return {};
	}
}

function loadProgress() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (e) {
		return null;
	}
}

function loadNotes() {
	try {
		const raw = localStorage.getItem(NOTES_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (e) {
		return {};
	}
}

function loadCodeNotes() {
	try {
		const raw = localStorage.getItem(CODE_NOTES_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (e) {
		return {};
	}
}

function initProgress() {
	const obj = {};
	plan.forEach((day) => {
		obj[day.day] = day.problems.map(() => false);
	});
	return obj;
}

export default function App() {
	const [progress, setProgress] = useState(() => loadProgress() || initProgress());
	const [activeDayIndex, setActiveDayIndex] = useState(0);
	const [timers, setTimers] = useState(() => loadTimers());
	const [notes, setNotes] = useState(() => loadNotes());
	const [codeNotes, setCodeNotes] = useState(() => loadCodeNotes());
	const [clockTick, setClockTick] = useState(() => Date.now());
	const totalProblems = plan.reduce((sum, day) => sum + day.problems.length, 0);
	const completedProblems = plan.reduce(
		(sum, day) => sum + (progress[day.day] || []).filter(Boolean).length,
		0,
	);
	const completionPct = Math.round((completedProblems / totalProblems) * 100);
	const completedDays = plan.filter((day) => (progress[day.day] || []).every(Boolean)).length;
	const activeDay = plan[activeDayIndex];
	const activeDoneCount = (progress[activeDay.day] || []).filter(Boolean).length;
	const activeTotal = activeDay.problems.length;
	const activePct = Math.round((activeDoneCount / activeTotal) * 100);
	const activeTimer = timers[activeDay.day] || EMPTY_TIMER;
	const liveElapsedMs = activeTimer.isRunning && activeTimer.startedAt ? activeTimer.elapsedMs + (clockTick - activeTimer.startedAt) : activeTimer.elapsedMs;
	const timerSeconds = Math.floor(liveElapsedMs / 1000);
	const timerHours = Math.floor(timerSeconds / 3600);
	const timerMinutes = Math.floor((timerSeconds % 3600) / 60);
	const timerRemainingSeconds = timerSeconds % 60;
	const timerDisplay = `${String(timerHours).padStart(2, "0")}:${String(timerMinutes).padStart(2, "0")}:${String(timerRemainingSeconds).padStart(2, "0")}`;
	const timerLabel = `Day ${activeDay.day} time`;
	const activeNote = notes[activeDay.day] || "";
	const activeCodeNote = codeNotes[activeDay.day] || "";
	const codeLineCount = Math.max(1, activeCodeNote.split("\n").length);

	const goPreviousDay = () => {
		setActiveDayIndex((current) => Math.max(0, current - 1));
	};

	const goNextDay = () => {
		setActiveDayIndex((current) => Math.min(plan.length - 1, current + 1));
	};

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
		} catch (e) {
			// ignore
		}
	}, [progress]);

	useEffect(() => {
		try {
			localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
		} catch (e) {
			// ignore
		}
	}, [timers]);

	useEffect(() => {
		try {
			localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
		} catch (e) {
			// ignore
		}
	}, [notes]);

	useEffect(() => {
		try {
			localStorage.setItem(CODE_NOTES_STORAGE_KEY, JSON.stringify(codeNotes));
		} catch (e) {
			// ignore
		}
	}, [codeNotes]);

	useEffect(() => {
		if (!activeTimer.isRunning) return undefined;

		const intervalId = window.setInterval(() => {
			setClockTick(Date.now());
		}, 1000);

		setClockTick(Date.now());
		return () => window.clearInterval(intervalId);
	}, [activeDay.day, activeTimer.isRunning, activeTimer.startedAt]);

	const updateActiveTimer = (updater) => {
		setTimers((currentTimers) => {
			const currentTimer = currentTimers[activeDay.day] || EMPTY_TIMER;
			const nextTimer = updater(currentTimer);
			return {
				...currentTimers,
				[activeDay.day]: nextTimer,
			};
		});
	};

	const startTimer = () => {
		updateActiveTimer((current) => {
			if (current.isRunning) return current;
			return {
				...current,
				isRunning: true,
				startedAt: Date.now(),
			};
		});
		setClockTick(Date.now());
	};

	const pauseTimer = () => {
		updateActiveTimer((current) => {
			if (!current.isRunning || !current.startedAt) return current;
			return {
				elapsedMs: current.elapsedMs + (Date.now() - current.startedAt),
				isRunning: false,
				startedAt: null,
			};
		});
	};

	const resetTimer = () => {
		updateActiveTimer(() => ({ ...EMPTY_TIMER }));
		setClockTick(Date.now());
	};

	const toggle = (dayNum, idx) => {
		setProgress((p) => {
			const copy = { ...p };
			copy[dayNum] = [...copy[dayNum]];
			copy[dayNum][idx] = !copy[dayNum][idx];
			return copy;
		});
	};

	const resetDay = (dayNum) => {
		setProgress((p) => ({ ...p, [dayNum]: p[dayNum].map(() => false) }));
	};

	const updateActiveNote = (value) => {
		setNotes((currentNotes) => ({
			...currentNotes,
			[activeDay.day]: value,
		}));
	};

	const clearActiveNote = () => {
		updateActiveNote("");
	};

	const updateActiveCodeNote = (value) => {
		setCodeNotes((currentCodeNotes) => ({
			...currentCodeNotes,
			[activeDay.day]: value,
		}));
	};

	const clearActiveCodeNote = () => {
		updateActiveCodeNote("");
	};

	return (
		<div className="app">
			<header>
				<div className="eyebrow">10-day revision system</div>
				<h1>Prep Tracker</h1>
				<p className="subtitle">Track progress, stay focused, and keep the whole plan visible at a glance.</p>
				<div className="heroStats" aria-label="Progress summary">
					<div className="statCard statCardPrimary">
						<span className="statLabel">Completion</span>
						<strong>{completionPct}%</strong>
						<small>{completedProblems}/{totalProblems} problems solved</small>
					</div>
					<div className="statCard">
						<span className="statLabel">Days complete</span>
						<strong>{completedDays}</strong>
						<small>out of {plan.length} study blocks</small>
					</div>
					<div className="statCard statCardAccent">
						<span className="statLabel">Saved locally</span>
						<strong>Yes</strong>
						<small>browser localStorage</small>
					</div>
					<div className="statCard timerCard">
						<span className="statLabel">{timerLabel}</span>
						<strong>{timerDisplay}</strong>
						<small>{activeTimer.isRunning ? "running now" : activeTimer.elapsedMs > 0 ? "paused stopwatch" : "starts at zero"}</small>
						<div className="timerActions">
							<button type="button" onClick={activeTimer.isRunning ? pauseTimer : startTimer} className="timerButton timerButtonPrimary">
								{activeTimer.isRunning ? "Pause" : activeTimer.elapsedMs > 0 ? "Resume" : "Start"}
							</button>
							<button type="button" onClick={resetTimer} className="timerButton">
								Reset
							</button>
						</div>
					</div>
				</div>
			</header>

			<main>
				<section className="dayNavigator" aria-label="Day navigation">
					<div className="dayRail" role="tablist" aria-label="Choose a study day">
						{plan.map((day, index) => {
							const doneCount = (progress[day.day] || []).filter(Boolean).length;
							const total = day.problems.length;
							const pct = Math.round((doneCount / total) * 100);

							return (
								<button
									key={day.day}
									type="button"
									className={`dayChip${index === activeDayIndex ? " is-active" : ""}`}
									onClick={() => setActiveDayIndex(index)}
									aria-pressed={index === activeDayIndex}
								>
									<span>Day {day.day}</span>
									<small>{pct}%</small>
								</button>
							);
						})}
					</div>
				</section>

				<section className="dayStageShell" aria-label="Active day content">
					<button className="navArrow navArrowSide" onClick={goPreviousDay} disabled={activeDayIndex === 0} aria-label="Previous day">
						←
					</button>

					<section className="day stage" style={{ "--day-index": activeDay.day }}>
						<div className="dayHeader">
							<div>
								<div className="dayTag">Step {activeDay.day} of {plan.length}</div>
								<h2>Day {activeDay.day}: {activeDay.title}</h2>
								<div className="meta">
									<span>{activeDoneCount}/{activeTotal} completed</span>
									<span>{activePct}%</span>
								</div>
								<div className="progressBar" aria-hidden="true">
									<span style={{ width: `${activePct}%` }} />
								</div>
							</div>
							<div className="actions">
								<button className="reset" onClick={() => resetDay(activeDay.day)}>Reset Day</button>
							</div>
						</div>

						<ul className="problems">
							{activeDay.problems.map((p, i) => (
								<li key={p} className="problemRow">
									<label>
										<input
											type="checkbox"
											checked={!!(progress[activeDay.day] && progress[activeDay.day][i])}
											onChange={() => toggle(activeDay.day, i)}
										/>
										<span className="problemText">{p}</span>
									</label>
								</li>
							))}
						</ul>
					</section>

					<button className="navArrow navArrowSide" onClick={goNextDay} disabled={activeDayIndex === plan.length - 1} aria-label="Next day">
						→
					</button>
				</section>
			</main>

			<section className="notesDock" aria-label="Day notes editor">
				<div className="notesDockGrid">
					<section className="notesPanel">
						<div className="notesDockHeader">
							<div>
								<div className="notesEyebrow">Notes</div>
								<h3>Day {activeDay.day}</h3>
							</div>
							<button type="button" className="notesClearButton" onClick={clearActiveNote} disabled={!activeNote.trim()}>
								Clear
							</button>
						</div>
						<textarea
							className="notesEditor notesEditorPlain"
							value={activeNote}
							onChange={(event) => updateActiveNote(event.target.value)}
							placeholder="Write normal study notes here"
						/>
					</section>

					<section className="notesPanel">
						<div className="notesDockHeader">
							<div>
								<div className="notesEyebrow">Code</div>
								<h3>Day {activeDay.day}</h3>
							</div>
							<button type="button" className="notesClearButton" onClick={clearActiveCodeNote} disabled={!activeCodeNote.trim()}>
								Clear
							</button>
						</div>
						<div className="codeEditorFrame">
							<div className="codeEditorToolbar">
								<span>JavaScript</span>
								<span>{codeLineCount} lines</span>
							</div>
							<div className="codeEditorBody">
								<div className="codeGutter" aria-hidden="true">
									{Array.from({ length: codeLineCount }, (_, index) => (
										<span key={index}>{index + 1}</span>
									))}
								</div>
								<textarea
									className="notesEditor notesEditorCode"
									value={activeCodeNote}
									onChange={(event) => updateActiveCodeNote(event.target.value)}
									placeholder="function solve() {\n  // write code here\n}"
								/>
							</div>
						</div>
					</section>
				</div>
			</section>

			<footer>
				<small>Local progress, timer, notes, and code blocks are stored in browser localStorage.</small>
			</footer>
		</div>
	);
}