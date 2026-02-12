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
    toString() {
        return `Vector(${this.x}, ${this.y})`;
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
    pos() {
        return vector(this.x, this.y);
    }
    dist(other) {
        return this.pos().sub(other.pos()).length();
    }
    toString() {
        return `Point(${this.x}, ${this.y})`;
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
    drawArc(other, ccw, profile) {
        setDrawSettings(profile);
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.vec().length(), this.vec().dirRaw(), other.vec().dirRaw(), ccw);
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
    toString() {
        return `Line(${this.p1}, ${this.p2})`;
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
    let angDiff = (l1.vec().dir() - l2.vec().dir()) * (ccw ? -1 : 1);
    while (angDiff < 0)
        angDiff += 360;
    while (angDiff > 360)
        angDiff -= 360;
    //console.log(`markAngle: ${count} ${angDiff}`);
    for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(l1.p1.x, l1.p1.y, MARK_RADIUS + i * MARK_STEP, l1.vec().dirRaw(), l2.vec().dirRaw(), !!ccw);
        ctx.stroke();
    }
}
const center = point(canvas.width / 2, canvas.height / 2);
function square(la, noRightAngle) {
    la.draw();
    const lb = la.p2.lineTo(la.vec().rotate(90)).draw();
    const lc = lb.p2.lineTo(lb.vec().rotate(90)).draw();
    const ld = lc.p2.lineTo(lc.vec().rotate(90)).draw();
    if (!noRightAngle) {
        markRightAngle(la, 1);
        markRightAngle(lb, 1);
        markRightAngle(lc, 1);
        markRightAngle(ld, 1);
    }
    return [la, lb, lc, ld];
}
// ====== application ======
const large = 10000;
function p1_p2() {
    // 1->2
    // solve ssa triangle so that line segment is trisected
    const R1a = 200;
    const R1b = R1a + 20;
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
    return [l1, l2];
}
const [_l1, _l2] = p1_p2();
function p4(l2end) {
    // 2->4
    const tri1a = l2end.lineTowards(120, 40).draw();
    const tri1b = l2end.lineTowards(60, 40).draw();
    const tri1c = line(tri1a.p2, tri1b.p2).draw();
    markHatches(tri1a, 1);
    markHatches(tri1b, 1);
    markHatches(tri1c, 1);
    const tri2a = tri1a.p2.lineTowards(180, 40).draw();
    const tri2b = tri1a.p2.lineTowards(120, 80).draw();
    const tri2c = line(tri2a.p2, tri2b.p2).draw();
    markHatches(tri2a, 1);
    markArrows(tri2b, 2);
    markRightAngle(tri2c, -1);
    markRightAngle(tri2c.reverse(), -1);
    const l4ray = center.lineTowards(120, large);
    const down1 = tri2c.p1.lineUntilIntersect(180, l4ray).draw();
    const down2 = tri2c.p2.lineUntilIntersect(180, l4ray).draw();
    const img = line(down1.p2, down2.p2).draw().drawCircle();
    const l4 = down1.p2.lineTowards(300, 80);
    markArrows(img, 2);
    return [l4, down1];
}
const [_l4, _l4down1] = p4(_l2.p2);
function p3(l4, l4down1) {
    // 4->3
    const img = l4.p1.moveTowards(0, 80).lineTowards(90, 60).draw();
    const hyp = line(l4.p1, img.p2).draw();
    const residue = img.p2.lineTowards(0, 20).drawCircle();
    markAngle(hyp, l4down1.reverse(), 2, true);
    markRightAngle(img, 1);
    markRightAngle(img, -1);
    const p = img.p1.moveTowards(0, 40);
    const a = p.lineTowards(0, 40);
    const c = p.lineUntilIntersect(135, img).draw();
    const d = p.lineTowards(180, 40);
    markAngle(c, d, 1);
    markAngle(c.reverse(), img.reverse(), 1, true);
    markHatches(d, 1, 2);
    const l3ray = center.lineTowards(90, large);
    const proj = img.p2.lineUntilIntersect(0, l3ray).draw();
    const img2 = proj.p2.lineTowards(-90, 60).draw();
    const l3 = img2.p2.lineTowards(-90, 60);
    markRightAngle(proj, -1);
    markRightAngle(proj.reverse(), 1);
    markHatches(img2, 2, 5);
    markHatches(l3, 2, 0, "important");
    return l3;
}
const _l3 = p3(_l4, _l4down1);
function p5(l4center) {
    // 4->5
    // sin a = sin(60) = sqrt(3)/2, sin b = 3/5
    // A = 5, B = 5*3/5*2/sqrt(3) = sqrt(12)
    const asin35 = invdegRel(Math.asin(3 / 5));
    const tangentDir = 150 - asin35;
    const tangentPoint = l4center.moveTowards(tangentDir + 90, 80);
    const l5ray = center.lineTowards(150, large);
    const startPoint = tangentPoint.moveUntilIntersect(tangentDir + 180, l5ray);
    const l5 = startPoint.lineTowards(150, 100);
    const tri1a = l5;
    const tri1cray = l5.p1.lineTowards(tangentDir, large);
    const tri1bray = l5.p2.lineTowards(tangentDir - 60, large);
    const tri1p = tri1bray.intersect(tri1cray);
    const tri1c = line(l5.p1, tri1p).draw();
    const tri1b = line(l5.p2, tri1p).draw();
    markAngle(tri1a, tri1c, 2, true);
    const tri2b = tri1b;
    const tri2a = tri2b.p2.lineTowards(tri2b.vec().dir() + 90, 40).draw();
    const tri2h = tri2b.p1.lineTowards(tri2b.vec().dir() + 30, 80).draw();
    markRightAngle(tri2b.reverse(), -1);
    markHatches(tri2a, 1, 3);
    const tri3a = tri2a.p2.lineTowards(tri2a.vec().dir(), 40).draw();
    const tri3b = tri2h.p2.lineTowards(tri2h.vec().dir(), 40).draw();
    const tri3c = line(tri3a.p2, tri3b.p2).draw();
    markHatches(tri3a, 1, -3);
    markHatches(tri3b, 1, -3);
    markHatches(tri3c, 1);
    const mark = tri1c.p2.lineTowards(tri1c.vec().dir(), 100).draw();
    markRightAngle(tri3c.reverse(), -1);
    return [l5, [tri1a.p1, tri1a.p2, tri2h.p2, tri3c.p1]];
}
const [_l5, _l5ex] = p5(_l4down1.p2);
function p6() {
    // ?->6
    // 6-8-14/5 triangle (ambiguous case + 6/8/10 triangle)
    const l6 = center.moveTowards(180, 200).lineTowards(180, 120).draw();
    // use sine law to find 2nd angle
    const ang = 180 - invdegRel(Math.asin(3 / 5 * 4 / 3));
    const tri1c = l6;
    const tri1b = l6.p2.lineTowards(ang, 2.8 * 20).draw();
    const tri1a = l6.p1.lineTowards(ang + invdegRel(Math.asin(3 / 5)), 8 * 20).draw();
    markAngle(tri1b.reverse(), tri1a.reverse(), 2);
    markHatches(tri1b, 3, -8);
    // indicate length 8
    const sq1 = square(line(tri1a.p2, tri1a.mid()));
    const sq2 = square(line(sq1[2].p2, sq1[2].mid()));
    const triangles = line(tri1c.p1, sq2[2].p1).draw();
    const sq4 = square(sq1[0].p2.lineTowards(sq1[0].vec().dir(), 40));
    markAngle(triangles, tri1a, 1);
    sq2.concat(sq4).forEach(v => markHatches(v, 1));
    // indicate 2.8
    tri1b.reverse().drawArc(sq1[3].reverse(), true);
    const tri2a = sq2[2].p2.lineTowards(sq2[2].vec().dir(), 20 * 2.4).draw();
    const tri2c = line(tri2a.p2, sq1[3].offset(20 * 1.2)).draw();
    markAngle(tri2c.reverse(), sq1[3].reverse(), 2, true);
    const sq3 = square(line(tri2c.p1, tri2c.offset(20 * 2)).reverse());
    sq3.forEach(v => markHatches(v, 1));
    const triangles2 = line(sq3[2].p2, tri2c.p2).draw();
    markAngle(tri2c.reverse(), triangles2.reverse(), 1);
    return [l6, tri1a, tri1b, [tri1a.p1, sq1[1].p2, triangles.p2, tri2a.p2]];
}
const [_l6, _l6tri1a, _l6tri1b, _l6ex] = p6();
[
    [0, 0],
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3]
].map((v) => {
    const p1 = _l5ex[v[0]];
    const p2 = _l6ex[v[1]];
    if (p1 && p2)
        line(p1, p2).draw();
});
function p7(l6tri1a, l6tri1b) {
    const l7ray = center.lineTowards(210, large);
    const l7 = center.moveTowards(210, 210).lineTowards(210, 140).draw();
    const tri1h = l7;
    const angle1 = 210 - invdegRel(Math.acos(6.8 / 7));
    const tri1a = l7.p1.lineTowards(angle1, 20 * 6.8).draw();
    const tri1b = l7.p2.lineTowards(angle1 - 90, 2 * Math.sqrt(276)).draw();
    // indicate sqrt(276)
    const tri2b = tri1b;
    const tri2a = tri2b.p1.lineTowards(tri2b.vec().dir() + 90, 40).draw();
    markHatches(tri2a, 1, -3);
    const tri2h = line(tri2a.p2, tri2b.p2).draw();
    const text20 = tri2a.mid().moveTo(vector(-40, 10));
    const text26 = text20.moveTo(vector(60, 12));
    setDrawSettings();
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("2.0", text20.x, text20.y);
    ctx.fillText("2.6", text26.x, text26.y);
    // indicate 6.8
    const sq1 = square(tri1a.p2.lineTowards(tri1a.reverse().vec().dir(), 80), true);
    const sq2 = square(sq1[0].mid().lineTowards(sq1[0].vec().dir(), 40));
    const sq1diag = line(sq1[0].p1, sq1[2].p1).draw();
    const ext28 = sq1[3].p1.lineTowards(sq1[3].reverse().vec().dir(), 2.8 * 20).draw();
    markHatches(ext28, 3);
    markAngle(sq1diag, tri1a.reverse(), 1, true);
    markRightAngle(sq1[3], 1);
    sq2.map(v => markHatches(v, 1));
    tri1a.reverse().drawArc(sq1[3].reverse());
    return l7;
}
const _l7 = p7(_l6tri1a, _l6tri1b);
function p89() {
    const m = 11;
    const l8 = center.moveTowards(240, m * 20).lineTowards(240, 8 * 20);
    const l9 = center.moveTowards(270, m * 20).lineTowards(270, 9 * 20);
    const tri1a = line(l8.mid(), l9.p2).draw();
    console.log(tri1a.vec().length() / 20);
    // please wind points clockwise
    function incircle(a, b, c) {
        const l1 = line(a, b).vec().length();
        const l2 = line(b, c).vec().length();
        const l3 = line(c, a).vec().length();
        const v = a.pos().scale(l2).add(b.pos().scale(l3)).add(c.pos().scale(l1)).scale(1 / (l1 + l2 + l3));
        const p = point(v.x, v.y);
        const s = 0.5 * (l1 + l2 + l3);
        return [p, Math.sqrt((s - l1) * (s - l2) * (s - l3) / s)];
    }
    const [p, rad] = incircle(l8.mid(), l9.p2, center);
    p.lineTowards(0, rad).drawCircle();
    const conn = line(l8.p1, l9.p1).draw();
    markAngle(conn, l8, 3, true);
    markAngle(conn.reverse(), l9, 3);
    // sqrt(8sqrt(3)) indicator
    const quadCenter = point(250, 750).moveTowards(45, 40).moveTowards(90, 20);
    const leg1 = quadCenter.lineTowards(0, Math.sqrt(3 * Math.sqrt(3)) * 20).draw();
    const leg2a = quadCenter.lineTowards(90, 1 * 20).draw();
    const leg2b = leg2a.p2.lineTowards(90, 2 * 20).draw();
    const leg3 = quadCenter.lineTowards(180, 3 * 20).draw();
    const leg4 = quadCenter.lineTowards(270, 3 * Math.sqrt(3) * 20).draw();
    const leg12 = line(leg1.p2, leg2a.p2).draw();
    const leg23 = line(leg2b.p2, leg3.p2).draw();
    const leg34 = line(leg3.p2, leg4.p2).draw();
    const leg41 = line(leg4.p2, leg1.p2).draw();
    markHatches(leg2b, 1, -2);
    markAngle(leg3.reverse(), leg23.reverse(), 1);
    markRightAngle(leg4, 1);
    const tri2a = leg3;
    const tri2b = line(leg3.p2, leg34.offset(3 * 20)).draw();
    const tri2c = line(tri2b.p2, quadCenter).draw();
    markHatches(tri2a, 2);
    markHatches(tri2b, 2);
    markHatches(tri2c, 2);
    const circle = line(leg4.p2, leg2a.p2);
    line(circle.mid(), circle.p1).drawArc(line(circle.mid(), circle.p2));
    const rect1 = leg1.p2.lineTowards(90, 3 * 20).draw();
    const rect2 = leg2b.p2.lineTowards(0, Math.sqrt(3 * Math.sqrt(3)) * 20).draw();
    return [l8, l9];
}
const [_l8, _l9] = p89();
[_l1, _l2, _l3, _l4, _l5, _l6, _l7, _l8, _l9].forEach(v => v.draw("important"));
// ref lines
for (let i = 0; i < 12; i++) {
    center.lineTowards(i * 30, 180).draw("debug");
}
