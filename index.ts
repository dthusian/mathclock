const canvas = document.getElementsByTagName("canvas")[0] || (() => { throw new Error("No canvas found"); })();
const ctx = canvas.getContext("2d") || (() => { throw new Error("No context found"); })();

function deg(x: number): number {
  return ((x - 90) / 180) * Math.PI;
}

function invdegRel(x: number): number {
  return (x / Math.PI) * 180;
}

function invdegAbs(x: number): number {
  return (x / Math.PI) * 180 + 90;
}

function normalizeDir(x: number) {
  return ((x % 360) + 360) % 360;
}

function setDrawSettings(profile?: string) {
  ctx.lineCap = "round";
  if(profile === "marker") {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
  } else if(profile === "important") {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
  } else if(profile === "debug") {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 4;
  } else {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
  }
}

class Vector {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  scale(c: number): Vector {
    return new Vector(this.x * c, this.y * c);
  }

  length(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  dir(): number {
    return invdegAbs(Math.atan2(this.y, this.x));
  }

  dirRaw(): number {
    return Math.atan2(this.y, this.x);
  }

  normalize(): Vector {
    const len = this.length();
    return new Vector(this.x / len, this.y / len);
  }

  setLength(c: number): Vector {
    return this.normalize().scale(c);
  }

  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  rotate(d: number): Vector {
    return vectorDir(this.dir() + d, this.length());
  }
}

function vector(x: number, y: number) {
  return new Vector(x, y);
}

function vectorDir(dir: number, r: number) {
  return new Vector(Math.cos(deg(dir)) * r, Math.sin(deg(dir)) * r);
}

function privateIntersect(pa: Point, pb: Point, va: Vector, vb: Vector): [number, number] {
  // vax * ta - vbx * tb = pbx - pax
  // vay * ta - vby * tb = pby - pay
  // cramer's rule
  const cx = pb.x - pa.x;
  const cy = pb.y - pa.y;
  const taNum = cy * vb.x - cx * vb.y;
  const tbNum = cy * va.x - cx * va.y;
  const den = va.y * vb.x - va.x * vb.y;
  if(Math.abs(den) < 1e-6) throw new Error("Likely parallel lines");
  const ta = taNum / den;
  const tb = tbNum / den;
  return [ta, tb];
}

class Point {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  moveTowards(dir: number, r: number): Point {
    return this.moveTo(vectorDir(dir, r));
  }
  
  moveTo(vec: Vector): Point {
    return new Point(this.x + vec.x, this.y + vec.y);
  }

  moveUntilIntersect(dir: number, l: Line): Point {
    const vec = vectorDir(dir, 1);
    const [ta, _] = privateIntersect(this, l.p1, vec, l.vec());
    return this.moveTo(vec.scale(ta));
  }

  lineTowards(dir: number, r: number): Line {
    return this.lineTo(vectorDir(dir, r));
  }

  lineTo(vec: Vector) {
    return new Line(this, this.moveTo(vec));
  }

  lineUntilIntersect(dir: number, l: Line) {
    return new Line(this, this.moveUntilIntersect(dir, l));
  }
}

function point(x: number, y: number): Point {
  return new Point(x, y);
}

class Line {
  readonly p1: Point;
  readonly p2: Point;
  constructor(p1: Point, p2: Point) {
    this.p1 = p1;
    this.p2 = p2;
  }

  vec(): Vector {
    return new Vector(this.p2.x - this.p1.x, this.p2.y - this.p1.y);
  }

  mid(): Point {
    return new Point((this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2);
  }

  offset(x: number): Point {
    return this.p1.moveTo(this.vec().setLength(x));
  }

  draw(profile?: string): Line {
    setDrawSettings(profile);
    ctx.beginPath();
    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
    ctx.stroke();
    return this;
  }

  drawCircle(profile?: string): Line {
    setDrawSettings(profile);
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, this.vec().length(), 0, 2 * Math.PI);
    ctx.stroke();
    return this;
  }

  intersect(other: Line): Point {
    const pa = this.p1;
    const pb = other.p1;
    const va = this.vec();
    const vb = other.vec();
    const [ta, tb] = privateIntersect(pa, pb, va, vb);
    if(ta > 1 || ta < 0 || tb > 1 || tb < 0) throw new Error("Lines don't intersect");
    return pa.moveTo(va.scale(ta));
  }
  
  reverse(): Line {
    return new Line(this.p2, this.p1);
  }
}

function line(p1: Point, p2: Point) {
  return new Line(p1, p2);
}

function angle(l1: Line, l2: Line) {
  return l1.vec().dir() - l2.vec().dir();
}

function privateMarkArrow(l: Line, offset: number, profile?: string) {
  const ARROW_LENGTH = 10;
  const vel = l.vec().normalize();
  const arrowA = vel.scale(ARROW_LENGTH).rotate(45);
  const arrowB = vel.scale(ARROW_LENGTH).rotate(-45);
  const point = l.offset(offset);
  point.lineTo(arrowA).draw(profile);
  point.lineTo(arrowB).draw(profile);
}

function privateMarkHatch(l: Line, offset: number, profile?: string) {
  const HATCH_LENGTH = 5;
  const vel = l.vec().normalize();
  const hatchA = vel.scale(HATCH_LENGTH).rotate(90);
  const hatchB = vel.scale(HATCH_LENGTH).rotate(-90);
  const point = l.offset(offset);
  point.lineTo(hatchA).draw(profile);
  point.lineTo(hatchB).draw(profile);
}

function privateMarkRaw(l: Line, offset: number, count: number, spacing: number, profile: string, cb: (l: Line, offset: number, profile?: string) => void) {
  for(let i = 0; i < count; i++) {
    cb(l, offset + spacing * (i - (count - 1) / 2), profile);
  }
}

function markArrows(l: Line, hatches: number, offset?: number, profile?: string) {
  privateMarkRaw(l, l.vec().length() / 2 - 5 + (offset || 0), hatches, 10, profile || "marker", privateMarkArrow);
}

function markHatches(l: Line, hatches: number, offset?: number, profile?: string) {
  privateMarkRaw(l, l.vec().length() / 2 + (offset || 0), hatches, 7, profile || "marker", privateMarkHatch);
}

function markRightAngle(l: Line, dir: number, profile?: string) {
  dir = Math.sign(dir);
  const MARK_LENGTH = 10;
  const vel = l.vec();
  const markA = vel.setLength(MARK_LENGTH);
  const markB = vel.setLength(MARK_LENGTH).rotate(dir * 90);
  const markAB = markA.add(markB);
  line(l.p1.moveTo(markA), l.p1.moveTo(markAB)).draw(profile || "marker");
  line(l.p1.moveTo(markB), l.p1.moveTo(markAB)).draw(profile || "marker");
}

function markAngle(l1: Line, l2: Line, count: number, ccw?: boolean, profile?: string) {
  const MARK_RADIUS = 15;
  const MARK_STEP = 5;
  setDrawSettings(profile || "marker");
  for(let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(l1.p1.x, l1.p1.y, MARK_RADIUS + i * MARK_STEP, l1.vec().dirRaw(), l2.vec().dirRaw(), !!ccw);
    ctx.stroke(); 
  }
}

const center = point(canvas.width / 2, canvas.height / 2);

// application

const large = 10000;
const R1a = 200;
const R1b = R1a + 20;

// 1->2

// solve ssa triangle so that line segment is trisected
const R2a = (() => {
  let a = R1b;
  let b = 120;
  let beta = 30 / 180 * Math.PI;
  let alpha = Math.asin((a / b) * Math.sin(beta));
  let gamma = Math.PI - alpha - beta;
  let c = b * Math.sin(gamma) / Math.sin(beta);
  return c;
})();
const R2b = R2a + 40;

const l1 = line(center.moveTowards(30, R1a), center.moveTowards(30, R1b));
const l1ext = l1.p2.lineTo(l1.vec().scale(2)).draw();
const l2 = line(center.moveTowards(60, R2a), center.moveTowards(60, R2b));
const l2img = l2.p1.lineTowards(30, R2b - R2a).draw().drawCircle();
const l2a = line(l1.p1, l2img.p2).draw();
const l2b = line(l1.p2, l2img.p1).draw();

markArrows(l1ext, 1);
markArrows(l2img, 1, 5);
markHatches(l2b, 1, -45);
markHatches(l2b, 1, 5);
markHatches(l2b, 1, 40);

// 2->4

const l4tri1a = l2.p2.lineTowards(120, 40).draw();
const l4tri1b = l2.p2.lineTowards(60, 40).draw();
const l4tri1c = line(l4tri1a.p2, l4tri1b.p2).draw();

markHatches(l4tri1a, 1);
markHatches(l4tri1b, 1);
markHatches(l4tri1c, 1);

const l4tri2a = l4tri1a.p2.lineTowards(180, 40).draw();
const l4tri2b = l4tri1a.p2.lineTowards(120, 80).draw();
const l4tri2c = line(l4tri2a.p2, l4tri2b.p2).draw();

markHatches(l4tri2a, 1);
markArrows(l4tri2b, 2);
markRightAngle(l4tri2c, -1);
markRightAngle(l4tri2c.reverse(), -1);

const l4ray = center.lineTowards(120, large);
const l4down1 = l4tri2c.p1.lineUntilIntersect(180, l4ray).draw();
const l4down2 = l4tri2c.p2.lineUntilIntersect(180, l4ray).draw();
const l4img = line(l4down1.p2, l4down2.p2).draw().drawCircle();
const l4 = l4down1.p2.lineTowards(300, 80);

markArrows(l4img, 2);

// 4->3

const l3img = l4.p1.moveTowards(0, 80).lineTowards(90, 60).draw();
const l3hyp = line(l4.p1, l3img.p2).draw();
const l3residue = l3img.p2.lineTowards(0, 20).drawCircle();

markRightAngle(l3img, 1);
markRightAngle(l3img, -1);

const l3p = l3img.p1.moveTowards(0, 40);
const l3a = l3p.lineTowards(0, 40);
const l3c = l3p.lineUntilIntersect(135, l3img).draw();
const l3d = l3p.lineTowards(180, 40);

markAngle(l3c, l3d, 1);
markAngle(l3c.reverse(), l3img.reverse(), 1, true);
markHatches(l3d, 1, 2);

const l3ray = center.lineTowards(90, large);
const l3proj = l3img.p2.lineUntilIntersect(0, l3ray).draw();
const l3img2 = l3proj.p2.lineTowards(-90, 60).draw();
const l3 = l3img2.p2.lineTowards(-90, 60);

markRightAngle(l3proj, -1);
markRightAngle(l3proj.reverse(), 1);
markHatches(l3img2, 2, 5);
markHatches(l3, 2, 0, "important");

// 4->5
// 45-60-75 triangle
// sin a = sin(45) = 1/sqrt(2), sin b = sin(60) = sqrt(3)/2
// A = 5, B = A*sin(60)/sin(45) = 5*sqrt(3)*sqrt(2)/2 = 5*sqrt(6)/2
// 45-?-? triangle
// sin a = sin(60) = sqrt(3)/2, sin b = 3/5
// A = 5, B = 5*3/5*2/sqrt(3) = sqrt(12)
const l5 = center.moveTowards(150, 240).lineTowards(150, 100);
const asin35 = invdegRel(Math.asin(3/5));
const l5tri1cray = l5.p1.lineTowards(150 - asin35, large);
const l5tri1bray = l5.p2.lineTowards(150 - asin35 - 60, large);
const l5tri1p = l5tri1bray.intersect(l5tri1cray);
const l5tri1c = line(l5.p1, l5tri1p).draw();
const l5tri1b = line(l5.p2, l5tri1p).draw();

[l1, l2, l3, l4, l5].forEach(v => v.draw("important"));

// ref lines
for(let i = 0; i < 12; i++) {
  center.lineTowards(i * 30, 180).draw("debug");
}