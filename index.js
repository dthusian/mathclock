"use strict";
const canvas = document.getElementsByTagName("canvas")[0] || (() => { throw new Error("No canvas found"); })();
const ctx = canvas.getContext("2d") || (() => { throw new Error("No context found"); })();
function deg(x) {
    return ((x - 90) / 180) * Math.PI;
}
function invdegRel(x) {
    return (x / Math.PI) * 180;
}
function invdegAbs(x) {
    return (x / Math.PI) * 180 + 90;
}
function normalizeDir(x) {
    return ((x % 360) + 360) % 360;
}
function setDrawSettings(profile) {
    ctx.lineCap = "round";
    if (profile === "marker") {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
    }
    else if (profile === "important") {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
    }
    else if (profile === "debug") {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 4;
    }
    else {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
    }
}
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    scale(c) {
        return new Vector(this.x * c, this.y * c);
    }
    length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    dir() {
        return invdegAbs(Math.atan2(this.y, this.x));
    }
    dirRaw() {
        return Math.atan2(this.y, this.x);
    }
    normalize() {
        const len = this.length();
        return new Vector(this.x / len, this.y / len);
    }
    setLength(c) {
        return this.normalize().scale(c);
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }
    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }
    rotate(d) {
        return vectorDir(this.dir() + d, this.length());
    }
}
function vector(x, y) {
    return new Vector(x, y);
}
function vectorDir(dir, r) {
    return new Vector(Math.cos(deg(dir)) * r, Math.sin(deg(dir)) * r);
}
function privateIntersect(pa, pb, va, vb) {
    // vax * ta - vbx * tb = pbx - pax
    // vay * ta - vby * tb = pby - pay
    // cramer's rule
    const cx = pb.x - pa.x;
    const cy = pb.y - pa.y;
    const taNum = cy * vb.x - cx * vb.y;
    const tbNum = cy * va.x - cx * va.y;
    const den = va.y * vb.x - va.x * vb.y;
    if (Math.abs(den) < 1e-6)
        throw new Error("Likely parallel lines");
    const ta = taNum / den;
    const tb = tbNum / den;
    return [ta, tb];
}
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    moveTowards(dir, r) {
        return this.moveTo(vectorDir(dir, r));
    }
    moveTo(vec) {
        return new Point(this.x + vec.x, this.y + vec.y);
    }
    moveUntilIntersect(dir, l) {
        const vec = vectorDir(dir, 1);
        const [ta, _] = privateIntersect(this, l.p1, vec, l.vec());
        return this.moveTo(vec.scale(ta));
    }
    lineTowards(dir, r) {
        return this.lineTo(vectorDir(dir, r));
    }
    lineTo(vec) {
        return new Line(this, this.moveTo(vec));
    }
    lineUntilIntersect(dir, l) {
        return new Line(this, this.moveUntilIntersect(dir, l));
    }
}
function point(x, y) {
    return new Point(x, y);
}
class Line {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    vec() {
        return new Vector(this.p2.x - this.p1.x, this.p2.y - this.p1.y);
    }
    mid() {
        return new Point((this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2);
    }
    offset(x) {
        return this.p1.moveTo(this.vec().setLength(x));
    }
    draw(profile) {
        setDrawSettings(profile);
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
        return this;
    }
    drawCircle(profile) {
        setDrawSettings(profile);
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.vec().length(), 0, 2 * Math.PI);
        ctx.stroke();
        return this;
    }
    intersect(other) {
        const pa = this.p1;
        const pb = other.p1;
        const va = this.vec();
        const vb = other.vec();
        const [ta, tb] = privateIntersect(pa, pb, va, vb);
        if (ta > 1 || ta < 0 || tb > 1 || tb < 0)
            throw new Error("Lines don't intersect");
        return pa.moveTo(va.scale(ta));
    }
    reverse() {
        return new Line(this.p2, this.p1);
    }
}
function line(p1, p2) {
    return new Line(p1, p2);
}
function angle(l1, l2) {
    return l1.vec().dir() - l2.vec().dir();
}
function privateMarkArrow(l, offset, profile) {
    const ARROW_LENGTH = 10;
    const vel = l.vec().normalize();
    const arrowA = vel.scale(ARROW_LENGTH).rotate(45);
    const arrowB = vel.scale(ARROW_LENGTH).rotate(-45);
    const point = l.offset(offset);
    point.lineTo(arrowA).draw(profile);
    point.lineTo(arrowB).draw(profile);
}
function privateMarkHatch(l, offset, profile) {
    const HATCH_LENGTH = 5;
    const vel = l.vec().normalize();
    const hatchA = vel.scale(HATCH_LENGTH).rotate(90);
    const hatchB = vel.scale(HATCH_LENGTH).rotate(-90);
    const point = l.offset(offset);
    point.lineTo(hatchA).draw(profile);
    point.lineTo(hatchB).draw(profile);
}
function privateMarkRaw(l, offset, count, spacing, profile, cb) {
    for (let i = 0; i < count; i++) {
        cb(l, offset + spacing * (i - (count - 1) / 2), profile);
    }
}
function markArrows(l, hatches, offset, profile) {
    privateMarkRaw(l, l.vec().length() / 2 - 5 + (offset || 0), hatches, 10, profile || "marker", privateMarkArrow);
}
function markHatches(l, hatches, offset, profile) {
    privateMarkRaw(l, l.vec().length() / 2 + (offset || 0), hatches, 7, profile || "marker", privateMarkHatch);
}
function markRightAngle(l, dir, profile) {
    dir = Math.sign(dir);
    const MARK_LENGTH = 10;
    const vel = l.vec();
    const markA = vel.setLength(MARK_LENGTH);
    const markB = vel.setLength(MARK_LENGTH).rotate(dir * 90);
    const markAB = markA.add(markB);
    line(l.p1.moveTo(markA), l.p1.moveTo(markAB)).draw(profile || "marker");
    line(l.p1.moveTo(markB), l.p1.moveTo(markAB)).draw(profile || "marker");
}
function markAngle(l1, l2, count, ccw, profile) {
    const MARK_RADIUS = 15;
    const MARK_STEP = 5;
    setDrawSettings(profile || "marker");
    for (let i = 0; i < count; i++) {
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
markAngle(l3hyp, l4down1.reverse(), 2, true);
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
const l5ray = center.lineTowards(150, large);
const l5angle1 = 150 - invdegRel(Math.asin(3 / 5)) + 90; // ensure sin beta = 3/5
// fake tri1 to figure out the dimensions of the real one
const l5tri1a = l4down1.p2.lineTowards(l5angle1, 60);
const l5tri1b = l5tri1a.p2.lineTowards(l5tri1a.vec().dir() + 90, Math.sqrt(7) * 20);
const l5tri1c = line(l5tri1b.p2, l4down1.p2).draw();
// offset the real tri1
const l5offa = 45;
const l5off1 = l5tri1c.p1.lineTowards(l5tri1c.vec().dir() + 90, l5offa).draw();
const l5off2 = l5tri1c.p2.lineTowards(l5tri1c.vec().dir() + 90, l5offa).draw();
markRightAngle(l5off1, -1);
markRightAngle(l5off2, 1);
markRightAngle(l5off2.reverse(), -1);
// real tri1
const l5tri1ra = l5off2.p2.lineTowards(l5angle1, 60).draw();
const l5tri1rb = line(l5tri1ra.p2, l5off1.p2).draw();
const l5tri1rc = line(l5off1.p2, l5off2.p2).draw();
markRightAngle(l5tri1rb, 1);
markHatches(l5tri1ra, 2, 0);
const l5tri2a = l5tri1rb.p2.lineUntilIntersect(l5tri1c.vec().dir(), l5ray).draw();
const l5tri2b = l5tri1rb.p2.lineUntilIntersect(l5tri1b.vec().dir(), l5ray).draw();
const l5tri2c = line(l5tri2a.p2, l5tri2b.p2);
const l5 = l5tri2c;
markAngle(l5.reverse(), l5tri2b.reverse(), 2, true);
console.log(l5tri2a.vec().length());
[l1, l2, l3, l4, l5].forEach(v => v.draw("important"));
// ref lines
for (let i = 0; i < 12; i++) {
    center.lineTowards(i * 30, 180).draw("debug");
}
