import type { WorkerAnimationState, WorkerStation, TechnologyEmployee, StationRegistry, Activity } from "@/utils/workers";
import { nextActivity, pathBetween } from "@/utils/workers";
import type { Pt } from "@/utils/interiorLayout";
import { HIP_SIT, HIP_STAND, type WorkerRig } from "./WorkerCharacter";

const SPEED = 0.22;
const TURN = 9;
const POSE = 10;

interface Joints { legL: number; legR: number; kneeL: number; kneeR: number; armLx: number; armRx: number; armRz: number; headY: number; headX: number; lean: number; hip: number; bob: number }
const ZERO: Joints = { legL: 0, legR: 0, kneeL: 0, kneeR: 0, armLx: 0, armRx: 0, armRz: 0, headY: 0, headX: 0, lean: 0, hip: HIP_STAND, bob: 0 };

/** Per-worker state machine. Lives in a ref; never writes React or store state per frame. */
export class WorkerAnimationController {
  state: WorkerAnimationState;
  pos: Pt; yaw: number;
  private path: Pt[] = [];
  private station: WorkerStation;
  private target: Activity;
  private timer: number;
  private t: number;
  private joints: Joints = { ...ZERO };

  constructor(private emp: TechnologyEmployee, private stations: WorkerStation[], private reg: StationRegistry, private rnd: () => number, first: Activity, private reduced: boolean) {
    const st = this.find(first.stationId);
    this.target = first;
    this.timer = first.duration;
    this.t = rnd() * 10;
    if (first.walkFirst) {
      this.pos = [...emp.spawn];
      this.yaw = -Math.PI / 2;
      this.station = st;
      this.path = pathBetween(null, this.pos, st);
      this.state = "WALKING";
    } else {
      this.pos = [...st.pos];
      this.yaw = st.facing;
      this.station = st;
      this.state = first.state;
      if (st.seated) Object.assign(this.joints, { legL: -Math.PI / 2, legR: -Math.PI / 2, kneeL: Math.PI / 2, kneeR: Math.PI / 2, hip: HIP_SIT });
    }
  }

  private find(id: string) { return this.stations.find((s) => s.id === id) ?? this.stations.find((s) => s.id === this.emp.homeStationId)!; }

  update(dt: number) {
    if (!this.reduced) this.t += dt;
    if (this.state === "WALKING") this.walk(dt);
    else if (!this.reduced && (this.timer -= dt) <= 0) {
      const next = nextActivity(this.emp, this.stations, this.reg, this.rnd, this.station.id);
      const to = this.find(next.stationId);
      this.target = next;
      if (to.id === this.station.id) { this.state = next.state; this.timer = next.duration; return; }
      this.path = pathBetween(this.station, this.pos, to);
      this.station = to;
      this.state = "WALKING";
    } else {
      this.yaw = turn(this.yaw, this.station.facing + (this.state === "PRESENTING" ? Math.sin(this.t * 0.6) * 0.7 : 0), dt);
    }
  }

  private walk(dt: number) {
    let step = SPEED * dt;
    while (step > 0 && this.path.length) {
      const [tx, tz] = this.path[0]!;
      const dx = tx - this.pos[0], dz = tz - this.pos[1];
      const d = Math.hypot(dx, dz);
      if (d < 1e-4) { this.path.shift(); continue; }
      this.yaw = turn(this.yaw, Math.atan2(dx, dz), dt);
      const m = Math.min(step, d);
      this.pos[0] += (dx / d) * m; this.pos[1] += (dz / d) * m;
      step -= m;
      if (m === d) this.path.shift();
    }
    if (!this.path.length) { this.state = this.target.state; this.timer = this.target.duration; }
  }

  apply(rig: WorkerRig, dt: number) {
    const target = pose(this.state, this.t, this.station.seated && this.state !== "WALKING");
    const k = 1 - Math.exp(-POSE * Math.min(dt, 0.05));
    const j = this.joints;
    for (const key of Object.keys(j) as (keyof Joints)[]) j[key] += (target[key] - j[key]) * k;
    if (rig.legL) rig.legL.rotation.x = j.legL;
    if (rig.legR) rig.legR.rotation.x = j.legR;
    if (rig.kneeL) rig.kneeL.rotation.x = j.kneeL;
    if (rig.kneeR) rig.kneeR.rotation.x = j.kneeR;
    if (rig.armL) rig.armL.rotation.x = j.armLx;
    if (rig.armR) { rig.armR.rotation.x = j.armRx; rig.armR.rotation.z = j.armRz; }
    if (rig.head) { rig.head.rotation.y = j.headY; rig.head.rotation.x = j.headX; }
    if (rig.torso) rig.torso.rotation.x = j.lean;
    const hipY = j.hip + j.bob;
    if (rig.hips) rig.hips.position.y = hipY;
    if (rig.legL) rig.legL.position.y = hipY;
    if (rig.legR) rig.legR.position.y = hipY;
  }
}

function turn(from: number, to: number, dt: number) {
  let d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  if (Math.abs(d) < 1e-3) return to;
  return from + d * (1 - Math.exp(-TURN * Math.min(dt, 0.05)));
}

/** Target joint angles for each state (forward is local +z; negative x-rotation swings a limb forward). */
export function pose(state: WorkerAnimationState, t: number, seated: boolean): Joints {
  const j: Joints = { ...ZERO };
  const s = Math.sin;
  if (seated) Object.assign(j, { legL: -Math.PI / 2, legR: -Math.PI / 2, kneeL: Math.PI / 2, kneeR: Math.PI / 2, hip: HIP_SIT });
  switch (state) {
    case "WALKING": {
      const p = t * 9;
      Object.assign(j, { legL: s(p) * 0.55, legR: -s(p) * 0.55, kneeL: Math.max(0, -s(p)) * 0.6, kneeR: Math.max(0, s(p)) * 0.6, armLx: -s(p) * 0.45, armRx: s(p) * 0.45, bob: Math.abs(s(p)) * 0.006, lean: 0.06 });
      break;
    }
    case "TYPING": {
      const pause = s(t * 0.7) > 0.75;
      const tap = pause ? 0 : 0.07;
      Object.assign(j, { armLx: -1.3 + s(t * 15) * tap, armRx: -1.3 + s(t * 15 + 1.6) * tap, lean: 0.14 + s(t * 0.4) * 0.03, headX: 0.12 + s(t * 0.9) * 0.04, headY: pause ? s(t * 0.5) * 0.3 : 0 });
      break;
    }
    case "SITTING":
      Object.assign(j, { armLx: -0.5, armRx: -0.5, lean: -0.05, headY: s(t * 0.4) * 0.35 });
      break;
    case "MEETING":
      Object.assign(j, { armLx: -0.7, armRx: -0.7 + Math.max(0, s(t * 1.3)) * -0.5, headY: s(t * 0.45) * 0.5, headX: s(t * 0.8) * 0.06, lean: 0.06 });
      break;
    case "PRESENTING":
      Object.assign(j, { armRx: -1.4 + s(t * 1.8) * 0.25, armRz: 0.5, armLx: -0.3 + s(t * 2.1) * 0.2, headY: s(t * 0.6) * -0.4, headX: -0.05 });
      break;
    case "CONVERSING":
      Object.assign(j, { armLx: -0.4 + s(t * 2.4) * 0.25, armRx: -0.2 + Math.max(0, s(t * 1.7)) * -0.5, headX: s(t * 3) * 0.06, headY: s(t * 0.5) * 0.15 });
      break;
    case "STANDING":
    case "IDLE":
      Object.assign(j, { armLx: s(t * 0.8) * 0.05, armRx: -s(t * 0.8) * 0.05, headY: s(t * 0.3) * 0.5, bob: s(t * 1.6) * 0.0015, lean: state === "IDLE" ? 0.03 : 0 });
      break;
  }
  return j;
}
