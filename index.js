"use strict";
const canvas = document.getElementsByTagName("canvas")[0] || (() => { throw new Error("No canvas found"); })();
const ctx = canvas.getContext("2d") || (() => { throw new Error("No context found"); })();
function degAbs(x) {
    return ((x - 90) / 180) * Math.PI;
}
function degRel(x) {
    return (x / 180) * Math.PI;
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
function setDrawSettings(settings) {
    ctx.lineCap = "round";
    if ((settings === null || settings === void 0 ? void 0 : settings.profile) === "marker") {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3 * (settings.scale || 1);
    }
    else if ((settings === null || settings === void 0 ? void 0 : settings.profile) === "important") {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4 * (settings.scale || 1);
    }
    else if ((settings === null || settings === void 0 ? void 0 : settings.profile) === "debug") {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 4 * (settings.scale || 1);
    }
    else {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4 * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    }
}
function clearCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    return new Vector(Math.cos(degAbs(dir)) * r, Math.sin(degAbs(dir)) * r);
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
    draw(settings) {
        setDrawSettings(settings);
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
        return this;
    }
    drawCircle(settings) {
        setDrawSettings(settings);
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.vec().length(), 0, 2 * Math.PI);
        ctx.stroke();
        return this;
    }
    drawArc(other, ccw, settings) {
        setDrawSettings(settings);
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
function privateMarkArrow(l, offset, settings) {
    const ARROW_LENGTH = 10 * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    const vel = l.vec().normalize();
    const arrowA = vel.scale(ARROW_LENGTH).rotate(45);
    const arrowB = vel.scale(ARROW_LENGTH).rotate(-45);
    const point = l.offset(offset);
    point.lineTo(arrowA).draw(settings);
    point.lineTo(arrowB).draw(settings);
}
function privateMarkHatch(l, offset, settings) {
    const HATCH_LENGTH = 5 * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    const vel = l.vec().normalize();
    const hatchA = vel.scale(HATCH_LENGTH).rotate(90);
    const hatchB = vel.scale(HATCH_LENGTH).rotate(-90);
    const point = l.offset(offset);
    point.lineTo(hatchA).draw(settings);
    point.lineTo(hatchB).draw(settings);
}
function privateMarkRaw(l, offset, count, spacing, settings, cb) {
    for (let i = 0; i < count; i++) {
        cb(l, offset + spacing * (i - (count - 1) / 2), settings);
    }
}
function markArrows(l, hatches, offset, settings) {
    privateMarkRaw(l, l.vec().length() / 2 - 5 + (offset || 0), hatches, 10, settings || { profile: "marker" }, privateMarkArrow);
}
function markHatches(l, hatches, offset, settings) {
    privateMarkRaw(l, l.vec().length() / 2 + (offset || 0), hatches, 7, settings || { profile: "marker" }, privateMarkHatch);
}
function markRightAngle(l, dir, settings) {
    dir = Math.sign(dir);
    const MARK_LENGTH = 10 * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    const vel = l.vec();
    const markA = vel.setLength(MARK_LENGTH);
    const markB = vel.setLength(MARK_LENGTH).rotate(dir * 90);
    const markAB = markA.add(markB);
    line(l.p1.moveTo(markA), l.p1.moveTo(markAB)).draw(settings || { profile: "marker" });
    line(l.p1.moveTo(markB), l.p1.moveTo(markAB)).draw(settings || { profile: "marker" });
}
function markAngle(l1, l2, count, ccw, settings) {
    let angDiff = (l2.vec().dir() - l1.vec().dir()) * (ccw ? -1 : 1);
    while (angDiff < 0)
        angDiff += 360;
    while (angDiff > 360)
        angDiff -= 360;
    const smallAngAdj = 45 / Math.min(angDiff, 45);
    const MARK_RADIUS = 15 * smallAngAdj * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    const MARK_STEP = 5 * ((settings === null || settings === void 0 ? void 0 : settings.scale) || 1);
    setDrawSettings(settings || { profile: "marker" });
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
function drawText(text, pos, settings) {
    setDrawSettings(settings);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = (settings === null || settings === void 0 ? void 0 : settings.textAlign) || "center";
    ctx.fillText(text, pos.x, pos.y);
}
// ====== application ======
function draw() {
    const large = 10000;
    clearCanvas();
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
        markHatches(l3, 2, 0, { profile: "important" });
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
        const text20 = tri2a.mid().moveTo(vector(-30, 10));
        const text26 = text20.moveTo(vector(60, 18));
        drawText("2.0", text20);
        drawText("2.6", text26);
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
    function p8_p9() {
        const l8 = center.moveTowards(240, (10 * Math.sqrt(3) - 4) * 20).lineTowards(240, 8 * 20);
        const l9 = center.moveTowards(270, 11 * 20).lineTowards(270, 9 * 20);
        const n = l9.p2.lineTowards(150, 10 * 20).draw();
        markRightAngle(n.reverse(), 1);
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
        const [p, rad] = incircle(center, n.p2, n.p1);
        p.lineTowards(0, rad).drawCircle();
        // indicate integer
        drawText("integer", n.mid().moveTo(vector(-40, 20)));
        drawText("odd", l9.mid().moveTo(vector(0, -10)), { profile: "important" });
        drawText("even", l8.mid().moveTo(vector(20, 20)), { profile: "important" });
        // indicate r > 3
        const lessThanRad = p.lineTowards(0, 60).draw();
        markHatches(lessThanRad, 2);
        // indicate leg symmetry
        line(l8.mid(), l8.p1).drawArc(line(l8.mid(), l8.p2));
        // indicate r < l8/2
        const radiusLine = p.lineUntilIntersect(150, l8).draw();
        // indicate l9 > 4/sqrt(3) * r
        const l8ext = center.moveTowards(240, (10 * Math.sqrt(3) - 2 * rad / 20) * 20).lineTowards(240, rad).draw();
        const l8perp = l8ext.p1.lineUntilIntersect(330, l9).draw();
        markRightAngle(l8perp, -1);
        // indicate l8 < 10
        const l8cmp1 = n.p2.moveTowards(240, 20 * Math.cos(Math.asin(3 / 4)) * 4).lineTowards(150, 3 * 20).draw();
        const l8cmp2 = l8cmp1.p2.lineTowards(150, 2 * 20).draw();
        markHatches(l8cmp1, 2);
        markHatches(l8cmp2, 1, 5);
        // indicate l9 < n
        n.drawArc(l9.reverse(), true);
        // => 3 < r
        // => 2r < l8 < 10
        // => 4/sqrt(3) * r < l9 < n
        return [l8, l9];
    }
    const [_l8, _l9] = p8_p9();
    function p10(l9) {
        const l10 = center.moveTowards(300, 200).lineTowards(300, 200);
        function drawLayer(base, dir, settings) {
            if (dir < 0) {
                base = base.reverse();
            }
            const bdir = base.vec().dir();
            const blen = base.vec().length();
            const asin1oSqrt5 = invdegRel(Math.asin(1 / Math.sqrt(5)));
            const asin2oSqrt5 = invdegRel(Math.asin(2 / Math.sqrt(5)));
            const leg1a = base.p1.lineTowards(bdir - dir * asin2oSqrt5, blen / Math.sqrt(5)).draw(settings);
            const leg1b = base.p2.lineTowards(bdir + 180 + dir * asin1oSqrt5, 2 * blen / Math.sqrt(5)).draw(settings);
            const leg2b = leg1b.p2.lineTowards(bdir, blen * 0.8).draw(settings);
            const leg2a = leg1b.p1.lineTowards(bdir - dir * 90, blen * 0.4).draw(settings);
            markRightAngle(leg2a.reverse(), dir, settings);
            markRightAngle(leg1a.reverse(), -dir, settings);
            markAngle(base.reverse(), leg1b, 3, dir < 0, settings);
            markAngle(leg1b.reverse(), leg2b, 3, dir > 0, settings);
            if (dir < 0) {
                return leg2b.reverse();
            }
            else {
                return leg2b;
            }
        }
        let base = l10.p1.lineTowards(210, 100).reverse().draw();
        const baseExt = base.p2.lineUntilIntersect(210, l9).draw();
        for (let i = 0; i < 25; i++) {
            base = drawLayer(base, (-1) ** i, { scale: 0.8 ** i });
        }
        const top = l10.p2.lineTowards(210, 100).draw();
        const pt = top.p2;
        const triA = pt.lineTowards(180, 1 * 60).draw();
        const triAext = triA.p1.lineUntilIntersect(180, l9).draw();
        const triB = triA.p2.lineTowards(90, 2 * 60).draw();
        const triH = line(triA.p1, triB.p2).draw();
        triB.mid().lineUntilIntersect(0, triH).draw();
        markHatches(triA, 2);
        markHatches(triB, 2, triB.vec().length() / 4 - 15);
        markHatches(triB, 2, -triB.vec().length() / 4);
        markRightAngle(triB, -1);
        markAngle(triB.reverse(), triH.reverse(), 3);
        const initMark = l10.p1.lineTowards(300, 40);
        markHatches(initMark, 1, 0, { profile: "important" });
        return l10;
    }
    const _l10 = p10(_l9);
    function p11(l10) {
        const l11 = center.moveTowards(330, 200).lineTowards(330, 20 * 11);
        const asinRcpSqrt5 = invdegRel(Math.asin(1 / Math.sqrt(5)));
        // 2sqrt5 indicator
        const tri1hext = line(l11.p2.moveTowards(180, 20 * Math.sqrt(5)), l11.p2.moveTowards(0, 20 * Math.sqrt(5))).draw();
        const tri1h = line(tri1hext.p1.moveTowards(-90, 30), tri1hext.p2.moveTowards(-90, 30)).draw();
        const tri1a = tri1h.p1.lineTowards(0 - asinRcpSqrt5, 4 * 20).draw();
        const tri1b = tri1h.p2.lineTowards(270 - asinRcpSqrt5, 2 * 20).draw();
        markHatches(tri1b, 1, 0);
        markRightAngle(tri1b.reverse(), 1);
        //markHatches(tri1a, 1, 20);
        //markHatches(tri1a, 1, -20);
        markAngle(tri1a, tri1h, 3);
        markHatches(tri1h, 5, 12);
        const tri1extDown = line(tri1hext.p1, tri1h.p1).draw();
        const tri1extUp = line(tri1hext.p2, tri1h.p2).draw();
        [tri1extDown, tri1extUp.reverse(), tri1hext.reverse(), tri1h].map(v => markRightAngle(v, 1));
        // optimizer problem
        function drawOpt(o, angle, scale, mode) {
            const angleRad = degRel(angle);
            const ground = o.lineTowards(90, scale).draw();
            const leftWall = o.lineTowards(0, scale * 2).draw();
            const rightWall = ground.p2.lineTowards(0, scale).draw();
            markRightAngle(leftWall, 1);
            markRightAngle(rightWall, -1);
            const lowPointOffset = vector(scale * Math.sin(angleRad), scale * ((Math.tan(angleRad) - Math.sin(angleRad) * Math.tan(angleRad)) - 1));
            const lowPoint = o.moveTo(lowPointOffset);
            const wedge1 = lowPoint.lineTowards(-angle, scale).draw();
            const wedge2 = lowPoint.lineTowards(90 - angle, scale).draw();
            wedge1.drawArc(wedge2);
            markRightAngle(wedge1, 1);
            if (mode === "extract") {
                const move = o.lineTowards(90, lowPointOffset.x);
                const mark = move.p2.lineTowards(0, 50).draw();
                markHatches(move, 4, 4);
            }
            if (mode === "ref") {
                markHatches(wedge2, 5);
                markHatches(ground, 5);
                markHatches(rightWall, 5);
            }
        }
        const scale = 2 * Math.sqrt(5) * 20;
        const orig1 = tri1h.p1.moveTowards(-90, scale + 40);
        const orig2 = orig1.moveTowards(-145, scale + 90);
        drawOpt(orig1, invdegRel(Math.asin((Math.sqrt(5) - 1) / 2)), scale, "extract");
        drawOpt(orig2, 5, scale, "ref");
        const rotateIconPoint = orig2.moveTo(vector(scale / 2, 10 - scale * 3 / 2));
        rotateIconPoint.lineTowards(0, 15).drawArc(rotateIconPoint.lineTowards(90, 15), true);
        rotateIconPoint.moveTo(vector(15, -6)).lineTowards(135, 10).draw();
        rotateIconPoint.moveTo(vector(15, -6)).lineTowards(225, 10).draw();
        // draw minimize
        const arrowLine = line(orig1.moveTowards(180, scale - 20), orig1.moveTowards(90, scale - 20));
        markArrows(arrowLine.reverse(), 5, 5);
        const angleRad = Math.asin((Math.sqrt(5) - 1) / 2);
        const height = scale * (2 - (Math.tan(angleRad) - Math.sin(angleRad) * Math.tan(angleRad)));
        const measureStop = line(orig1.moveTo(vector(-30, -height)), orig1.moveTo(vector(80, -height))).draw();
        const measureLine = orig1.moveTowards(-90, 10).lineTowards(0, height).draw();
        markArrows(measureLine, 1, 5 - height / 2);
        markArrows(measureLine.reverse(), 1, 7 - height / 2);
        drawText("minimize", measureLine.mid().moveTowards(-90, 52));
        // rest of l11
        line(tri1hext.mid(), tri1hext.p2).drawArc(line(tri1h.mid(), tri1h.p1));
        const sqrt5q2 = Math.sqrt(5) * (Math.sqrt(5) - 1);
        const p2 = Math.sqrt(5) + 1;
        const part1 = l11.p1.lineTowards(330, sqrt5q2 * 20);
        const part2 = part1.p2.lineTowards(330, p2 * 20);
        const part3 = part2.p2.lineTowards(330, sqrt5q2 * 20);
        part1.p2.lineUntilIntersect(240, l10).draw();
        part1.p1.lineUntilIntersect(240, l10).draw();
        line(center, part3.p1).drawArc(l10, true);
        line(center, part3.p2).drawArc(l10, true);
        markHatches(part1, 4, 0, { profile: "important" });
        markHatches(part3, 4, 0, { profile: "important" });
        const pent1 = part2.p1.lineTowards(330 - 36, 40).draw();
        const pent2 = pent1.p2.lineTowards(330 - 36 + 72, 40).draw();
        const pent3 = pent2.p2.lineTowards(330 - 36 + 72 * 2, 40).draw();
        const pent4 = pent3.p2.lineTowards(330 - 36 + 72 * 3, 40).draw();
        const pent5 = pent4.p2.lineTowards(330 - 36 + 72 * 4, 40).draw();
        [pent1, pent2, pent3, pent4, pent5].map(v => markHatches(v, 1));
        return l11;
    }
    const _l11 = p11(_l10);
    function p12() {
        const l12 = center.moveTowards(0, 240).lineTowards(0, 240).draw();
        function drawLayer(base, index, scale, lineScale) {
            const settings = { scale: lineScale };
            const ratio = 2 / 3;
            const tri1b = base.lineTowards(0, index * 40 * scale);
            const tri1a = tri1b.p2.lineTowards(90, index * 40).draw(settings);
            const tri1h = line(tri1a.p2, tri1b.p1).draw(settings);
            const tri2a = tri1a.p2.lineTowards(90, 40).draw(settings);
            const tri2b = tri2a.p2.lineTowards(0, 40 * scale).draw(settings);
            const tri2h = line(tri2a.p1, tri2b.p2).draw(settings);
            const tri2bext = tri2b.p2.lineTowards(0, (index + 1) * 40 * (scale * ratio) - 40 * scale).draw(settings);
            markHatches(tri2a, 1, 0, settings);
            markRightAngle(tri1a, 1, settings);
            markRightAngle(tri2b, -1, settings);
            const nextScale = scale * ratio;
            const nextIndex = index + 1;
            const horiz1 = tri2b.p1.lineTowards(90, 40).draw(settings);
            const horiz2 = tri2b.p2.lineTowards(90, 40).draw(settings);
            const ls = tri2b.mid().moveTowards(90, 20 * scale).lineTowards(0, 17 * scale).drawCircle(settings);
            const rect0 = horiz2.p2.lineTowards(90, 40 * nextScale).draw(settings);
            const rect2 = horiz1.p2.lineTowards(90, 40 * nextScale).draw(settings);
            const rect1 = line(rect0.p2, rect2.p2).draw(settings);
            const rect3 = line(rect0.p1, rect2.p1).draw(settings);
            const split0h = rect3.p1.moveTo(rect3.vec().scale(1 / 3)).lineTowards(90, 40 * nextScale).draw(settings);
            const split1h = rect3.p1.moveTo(rect3.vec().scale(2 / 3)).lineTowards(90, 40 * nextScale).draw(settings);
            const split2v = line(rect0.mid(), rect2.mid()).draw(settings);
            const vert1 = rect0.p1.lineTowards(0, nextIndex * 40 * nextScale - 40 * scale).draw(settings);
            const vert2 = rect0.p2.lineTowards(0, nextIndex * 40 * nextScale - 40 * scale + 40 * nextScale).draw(settings);
            if (index === 1) {
                markHatches(tri1a, 1, 0, settings);
                const vert3 = tri2a.p2.lineTowards(180, 50).draw(settings);
                const vert4 = tri2a.p2.moveTowards(90, 40 * scale).lineTowards(180, 50).draw(settings);
                const vert5 = vert4.p1.lineTowards(0, 40 * scale).draw(settings);
                const l = [0, 0, 0, 0];
                for (let i = 0; i < 4; i++) {
                    l[i] = line(vert3.p2.moveTowards(0, i * 40 / 3), vert4.p2.moveTowards(0, i * 40 / 3)).draw(settings);
                }
                const l2 = l;
                const lv = line(l2[0].mid(), l2[3].mid()).draw(settings);
                const horiz3 = l2[0].p1.lineTowards(-90, 10).draw(settings);
                const horiz4 = l2[3].p1.lineTowards(-90, 10).draw(settings);
                const cap = line(horiz3.p2, horiz4.p2).draw(settings);
                markHatches(cap, 1, 0, settings);
            }
            return tri1b.p2;
        }
        let base = l12.p1;
        for (let i = 1; i <= 50; i++) {
            base = drawLayer(base, i, (2 / 3) ** i, (3 / 4) ** i);
        }
        return l12;
    }
    const _l12 = p12();
    [_l1, _l2, _l3, _l4, _l5, _l6, _l7, _l8, _l9, _l10, _l11, _l12].forEach(v => v.draw({ profile: "important" }));
    function credits(base) {
        const text = [
            "dthusian's",
            "entry",
            "dr.zye's",
            "math",
            "clock",
            "contest",
            "2026"
        ];
        text.forEach((v, i) => drawText(v, base.moveTowards(180, i * 30), { textAlign: "right" }));
    }
    credits(center.moveTowards(0, 470).moveTowards(-90, 7));
    function clockHands() {
        const now = new Date();
        const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
        const minutes = now.getMinutes() + seconds / 60;
        const hour = now.getHours() + minutes / 60;
        center.lineTowards(6 * minutes, 160).draw({ scale: 2 });
        center.lineTowards(20 * hour, 70).draw({ scale: 2 });
        center.lineTowards(6 * seconds, 140).draw({ scale: 0.5, profile: "important" });
    }
    clockHands();
}
window.requestAnimationFrame(function animate() {
    draw();
    window.requestAnimationFrame(animate);
});
