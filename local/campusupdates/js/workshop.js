(function() {
    'use strict';

    var FALLBACK = {
        name: 'Bakery — March actuals',
        price1: 30,
        priceDrop1: 0.05,
        cost1: 12.5,
        price2: 16,
        priceDrop2: 0.02,
        cost2: 4.5,
        congestion: 0.01,
        fixedCost: 1000,
        currentX: 200,
        currentY: 150,
        labels: {
            product1: 'puffs',
            product2: 'teas',
            unit1: 'puffs per day',
            unit2: 'teas per day',
            currency: '₹'
        }
    };

    function readSample() {
        var node = document.getElementById('ws-sample-json');
        if (node) {
            try {
                var data = JSON.parse(node.textContent || '{}');
                if (data && data.price1 != null && data.currentX != null) {
                    return data;
                }
            } catch (e) {
                // Use the baked-in bakery numbers.
            }
        }
        return JSON.parse(JSON.stringify(FALLBACK));
    }

    function coeffs(m) {
        return {
            A: m.price1 - m.cost1,
            B: m.priceDrop1,
            C: m.price2 - m.cost2,
            D: m.priceDrop2,
            E: m.congestion,
            F: m.fixedCost
        };
    }

    function profit(c, x, y) {
        return c.A * x - c.B * x * x + c.C * y - c.D * y * y - c.E * x * y - c.F;
    }

    function slopeX(c, x, y) {
        return c.A - 2 * c.B * x - c.E * y;
    }

    function slopeY(c, x, y) {
        return c.C - 2 * c.D * y - c.E * x;
    }

    function peak(c) {
        var den = 4 * c.B * c.D - c.E * c.E;
        if (den <= 0) {
            return {ok: false, den: den};
        }
        var x = (2 * c.D * c.A - c.E * c.C) / den;
        var y = (2 * c.B * c.C - c.E * c.A) / den;
        var warn = '';
        if (x < 0) {
            x = 0;
            warn = 'With these numbers the best you can do is stop selling puffs.';
        }
        if (y < 0) {
            y = 0;
            warn = (warn ? warn + ' ' : '') + 'With these numbers the best you can do is stop selling teas.';
        }
        return {ok: true, den: den, x: x, y: y, warn: warn};
    }

    function rupees(n, decimals) {
        var d = decimals == null ? 0 : decimals;
        var sign = n < 0 ? '−' : '';
        return sign + '₹' + Math.abs(n).toLocaleString('en-IN', {
            minimumFractionDigits: d,
            maximumFractionDigits: d
        });
    }

    function roundUnits(n) {
        return Math.round(n);
    }

    function roundMonth(n) {
        return Math.round(n / 50) * 50;
    }

    function slopeSentence(kind, value) {
        var abs = rupees(Math.abs(value), 2);
        if (Math.abs(value) < 0.005) {
            return 'One more ' + kind + ' does not change profit here — you are at the top for ' + kind + 's.';
        }
        if (value > 0) {
            return 'Each extra ' + kind.replace(/s$/, '') + ' makes you ' + abs + ' more.';
        }
        return 'Each extra ' + kind.replace(/s$/, '') + ' loses you ' + abs + '.';
    }

    function boot() {
        var root = document.getElementById('cu-workshop');
        if (!root) {
            return;
        }

        var SAMPLE = readSample();
        var model = JSON.parse(JSON.stringify(SAMPLE));
        var actuals = {x: SAMPLE.currentX, y: SAMPLE.currentY};
        var freeze = 'y';
        var showContourA = false;
        var showArrow = true;
        var trail = [];
        var yaw = 0;
        var range = {xmin: 0, xmax: 400, ymin: 0, ymax: 500};

        var form = document.getElementById('ws-form');
        var warnEl = document.getElementById('ws-warn');
        var profitChip = document.getElementById('ws-profit-chip');
        var fields = ['price1', 'priceDrop1', 'cost1', 'price2', 'priceDrop2', 'cost2', 'congestion', 'fixedCost', 'currentX', 'currentY'];

        function c() {
            return coeffs(model);
        }

        function expandRange() {
            range = {xmin: 0, xmax: 400, ymin: 0, ymax: 500};
            var pad = 40;
            if (model.currentX > range.xmax) {
                range.xmax = model.currentX + pad;
            }
            if (model.currentY > range.ymax) {
                range.ymax = model.currentY + pad;
            }
            var pk = peak(c());
            if (pk.ok) {
                range.xmax = Math.max(range.xmax, pk.x + pad);
                range.ymax = Math.max(range.ymax, pk.y + pad);
            }
            document.getElementById('ws-slider-x').max = String(Math.round(range.xmax));
            document.getElementById('ws-slider-y').max = String(Math.round(range.ymax));
            syncFreezeLabel();
        }

        function fillForm() {
            fields.forEach(function(k) {
                form.elements[k].value = model[k];
                form.elements[k].classList.remove('is-blank');
            });
            document.getElementById('ws-model-name').textContent = model.name || 'Custom shop';
        }

        function readForm() {
            var blank = false;
            fields.forEach(function(k) {
                var input = form.elements[k];
                var v = input.value;
                if (v === '' || v == null) {
                    blank = true;
                    input.classList.add('is-blank');
                    return;
                }
                input.classList.remove('is-blank');
                model[k] = Number(v);
            });
            return !blank;
        }

        function setWarn(msg) {
            warnEl.hidden = !msg;
            warnEl.textContent = msg || '';
        }

        function validate() {
            var cf = c();
            var pk = peak(cf);
            var msgs = [];
            if (!pk.ok) {
                setWarn("These numbers don't describe a business with a best combination — try a smaller congestion value.");
                return false;
            }
            if (model.congestion === 0) {
                msgs.push('Congestion is zero — puffs and teas no longer affect each other. The landscape becomes two independent problems.');
            }
            if (model.price1 < model.cost1) {
                msgs.push('You lose money on every puff.');
            }
            if (model.price2 < model.cost2) {
                msgs.push('You lose money on every tea.');
            }
            if (pk.warn) {
                msgs.push(pk.warn);
            }
            setWarn(msgs.join(' '));
            return true;
        }

        function updateChip() {
            var p = profit(c(), model.currentX, model.currentY);
            profitChip.textContent = 'Profit today · ' + rupees(p, 0);
        }

        function updateHere() {
            document.getElementById('ws-here-a').textContent =
                'You are here — ' + roundUnits(model.currentX) + ' puffs, ' + roundUnits(model.currentY) + ' teas';
        }

        function colorForZ(t) {
            var light = [232, 244, 242];
            var dark = [15, 118, 110];
            var r = Math.round(light[0] + (dark[0] - light[0]) * t);
            var g = Math.round(light[1] + (dark[1] - light[1]) * t);
            var b = Math.round(light[2] + (dark[2] - light[2]) * t);
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        }

        function gridStats(cf) {
            var nx = 40;
            var ny = 40;
            var zmin = Infinity;
            var zmax = -Infinity;
            var i;
            var j;
            var x;
            var y;
            var z;
            for (i = 0; i <= nx; i++) {
                x = range.xmin + (range.xmax - range.xmin) * i / nx;
                for (j = 0; j <= ny; j++) {
                    y = range.ymin + (range.ymax - range.ymin) * j / ny;
                    z = profit(cf, x, y);
                    if (z < zmin) {
                        zmin = z;
                    }
                    if (z > zmax) {
                        zmax = z;
                    }
                }
            }
            return {nx: nx, ny: ny, zmin: zmin, zmax: zmax};
        }

        function project(x, y, z, stats, w, h, yawOff) {
            var nx = (x - range.xmin) / (range.xmax - range.xmin || 1);
            var ny = (y - range.ymin) / (range.ymax - range.ymin || 1);
            var nz = (z - stats.zmin) / (stats.zmax - stats.zmin || 1);
            var ang = (yawOff || 0) * 0.35;
            var rx = nx * Math.cos(ang) - ny * Math.sin(ang);
            var ry = nx * Math.sin(ang) + ny * Math.cos(ang);
            return {
                x: (rx - ry) * 0.40 * w + w * 0.5,
                y: (rx + ry) * 0.15 * h - nz * 0.34 * h + h * 0.64
            };
        }

        function canvasSize(canvas) {
            var w = canvas.clientWidth;
            var h = canvas.clientHeight;
            if (w < 40) {
                w = (canvas.parentElement && canvas.parentElement.clientWidth) || 640;
            }
            if (h < 40) {
                h = parseInt(window.getComputedStyle(canvas).height, 10) || 320;
            }
            return {w: w, h: h};
        }

        function drawDot(ctx, pt, fill, r, label) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r || 7, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.lineWidth = 1;
            if (label) {
                ctx.font = '11px system-ui, sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(label, pt.x + 10, pt.y - 8);
            }
        }

        function drawArrowHead(ctx, from, to, color) {
            var ang = Math.atan2(to.y - from.y, to.x - from.x);
            ctx.beginPath();
            ctx.moveTo(to.x, to.y);
            ctx.lineTo(to.x - 11 * Math.cos(ang - 0.4), to.y - 11 * Math.sin(ang - 0.4));
            ctx.lineTo(to.x - 11 * Math.cos(ang + 0.4), to.y - 11 * Math.sin(ang + 0.4));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        function drawCuttingPlane(ctx, cf, stats, w, h, yawOff, frozen, axis) {
            var n = 36;
            var k;
            var tops = [];
            var bots = [];
            for (k = 0; k <= n; k++) {
                var xv;
                var yv;
                if (axis === 'y') {
                    xv = range.xmin + (range.xmax - range.xmin) * k / n;
                    yv = frozen;
                } else {
                    xv = frozen;
                    yv = range.ymin + (range.ymax - range.ymin) * k / n;
                }
                tops.push(project(xv, yv, profit(cf, xv, yv), stats, w, h, yawOff));
                bots.push(project(xv, yv, stats.zmin, stats, w, h, yawOff));
            }
            ctx.beginPath();
            ctx.moveTo(bots[0].x, bots[0].y);
            for (k = 0; k <= n; k++) {
                ctx.lineTo(tops[k].x, tops[k].y);
            }
            for (k = n; k >= 0; k--) {
                ctx.lineTo(bots[k].x, bots[k].y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(30, 58, 95, 0.22)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(30, 58, 95, 0.45)';
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(tops[0].x, tops[0].y);
            for (k = 1; k <= n; k++) {
                ctx.lineTo(tops[k].x, tops[k].y);
            }
            ctx.strokeStyle = '#1e3a5f';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        function drawSurface(canvas, opts) {
            var ctx = canvas.getContext('2d');
            var dpr = window.devicePixelRatio || 1;
            var size = canvasSize(canvas);
            var w = size.w;
            var h = size.h;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            var cf = c();
            var stats = gridStats(cf);
            var yawOff = opts.yaw || 0;

            if (opts.contour) {
                drawContour(ctx, w, h, cf, stats, opts);
                return;
            }

            var nx = opts.coarse ? 20 : 26;
            var ny = opts.coarse ? 20 : 26;
            var i;
            var j;
            var cells = [];
            for (i = 0; i < nx; i++) {
                for (j = 0; j < ny; j++) {
                    cells.push({i: i, j: j, key: i + j});
                }
            }
            cells.sort(function(a, b) {
                return b.key - a.key;
            });
            cells.forEach(function(cell) {
                var x0 = range.xmin + (range.xmax - range.xmin) * cell.i / nx;
                var y0 = range.ymin + (range.ymax - range.ymin) * cell.j / ny;
                var x1 = range.xmin + (range.xmax - range.xmin) * (cell.i + 1) / nx;
                var y1 = range.ymin + (range.ymax - range.ymin) * (cell.j + 1) / ny;
                var z00 = profit(cf, x0, y0);
                var z10 = profit(cf, x1, y0);
                var z01 = profit(cf, x0, y1);
                var z11 = profit(cf, x1, y1);
                var zmid = (z00 + z11) / 2;
                var t = (zmid - stats.zmin) / (stats.zmax - stats.zmin || 1);
                var p00 = project(x0, y0, z00, stats, w, h, yawOff);
                var p10 = project(x1, y0, z10, stats, w, h, yawOff);
                var p01 = project(x0, y1, z01, stats, w, h, yawOff);
                var p11 = project(x1, y1, z11, stats, w, h, yawOff);
                ctx.beginPath();
                ctx.moveTo(p00.x, p00.y);
                ctx.lineTo(p10.x, p10.y);
                ctx.lineTo(p11.x, p11.y);
                ctx.lineTo(p01.x, p01.y);
                ctx.closePath();
                ctx.fillStyle = colorForZ(t);
                ctx.fill();
                ctx.strokeStyle = 'rgba(15,118,110,0.12)';
                ctx.stroke();
            });

            if (opts.plane != null) {
                drawCuttingPlane(ctx, cf, stats, w, h, yawOff, opts.plane, opts.planeAxis);
            }

            if (opts.peak) {
                var pk = peak(cf);
                if (pk.ok) {
                    var peakPt = project(pk.x, pk.y, profit(cf, pk.x, pk.y), stats, w, h, yawOff);
                    drawDot(ctx, peakPt, '#0f766e', 6, 'top');
                }
            }

            var zHere = profit(cf, model.currentX, model.currentY);
            var here = project(model.currentX, model.currentY, zHere, stats, w, h, yawOff);
            drawDot(ctx, here, '#1e3a5f', 7, 'you');

            ctx.fillStyle = '#334155';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText('puffs per day', 12, h - 10);
            ctx.fillText('teas per day', w - 96, h - 10);
        }

        function mapXY(x, y, w, h, pad) {
            pad = pad || 28;
            return {
                x: pad + (x - range.xmin) / (range.xmax - range.xmin || 1) * (w - pad * 2),
                y: h - pad - (y - range.ymin) / (range.ymax - range.ymin || 1) * (h - pad * 2)
            };
        }

        function drawLevelRing(ctx, w, h, cf, pad, level, color, width) {
            var nx = 48;
            var ny = 48;
            function zAt(ii, jj) {
                var x = range.xmin + (range.xmax - range.xmin) * ii / nx;
                var y = range.ymin + (range.ymax - range.ymin) * jj / ny;
                return profit(cf, x, y);
            }
            function pt(ii, jj) {
                return mapXY(
                    range.xmin + (range.xmax - range.xmin) * ii / nx,
                    range.ymin + (range.ymax - range.ymin) * jj / ny,
                    w, h, pad
                );
            }
            function lerp(a, b, za, zb) {
                var t = za === zb ? 0.5 : (level - za) / (zb - za);
                t = Math.max(0, Math.min(1, t));
                return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
            }
            ctx.beginPath();
            var i;
            var j;
            for (i = 0; i < nx; i++) {
                for (j = 0; j < ny; j++) {
                    var z00 = zAt(i, j);
                    var z10 = zAt(i + 1, j);
                    var z11 = zAt(i + 1, j + 1);
                    var z01 = zAt(i, j + 1);
                    var p00 = pt(i, j);
                    var p10 = pt(i + 1, j);
                    var p11 = pt(i + 1, j + 1);
                    var p01 = pt(i, j + 1);
                    var bits = (z00 > level ? 1 : 0) + (z10 > level ? 2 : 0) + (z11 > level ? 4 : 0) + (z01 > level ? 8 : 0);
                    if (bits === 0 || bits === 15) {
                        continue;
                    }
                    var segs = [];
                    if ((bits & 1) !== ((bits & 2) ? 1 : 0)) {
                        segs.push(lerp(p00, p10, z00, z10));
                    }
                    if (((bits & 2) ? 1 : 0) !== ((bits & 4) ? 1 : 0)) {
                        segs.push(lerp(p10, p11, z10, z11));
                    }
                    if (((bits & 4) ? 1 : 0) !== ((bits & 8) ? 1 : 0)) {
                        segs.push(lerp(p11, p01, z11, z01));
                    }
                    if (((bits & 8) ? 1 : 0) !== (bits & 1)) {
                        segs.push(lerp(p01, p00, z01, z00));
                    }
                    if (segs.length >= 2) {
                        ctx.moveTo(segs[0].x, segs[0].y);
                        ctx.lineTo(segs[1].x, segs[1].y);
                    }
                }
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = width || 1.2;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        function drawContour(ctx, w, h, cf, stats, opts) {
            var nx = 80;
            var ny = 80;
            var i;
            var j;
            var pad = 28;
            var cw = (w - pad * 2) / nx;
            var ch = (h - pad * 2) / ny;
            for (i = 0; i < nx; i++) {
                for (j = 0; j < ny; j++) {
                    var x = range.xmin + (range.xmax - range.xmin) * (i + 0.5) / nx;
                    var y = range.ymin + (range.ymax - range.ymin) * (j + 0.5) / ny;
                    var z = profit(cf, x, y);
                    var t = (z - stats.zmin) / (stats.zmax - stats.zmin || 1);
                    var band = Math.max(0, Math.min(6, Math.floor(t * 7)));
                    ctx.fillStyle = colorForZ(band / 6);
                    ctx.fillRect(pad + i * cw, h - pad - (j + 1) * ch, cw + 0.5, ch + 0.5);
                }
            }

            if (opts && opts.breakEvenOnly) {
                drawLevelRing(ctx, w, h, cf, pad, 0, '#0f172a', 1.8);
                ctx.fillStyle = '#334155';
                ctx.font = '12px system-ui, sans-serif';
                ctx.fillText('Break-even ring (profit = 0)', pad, 18);
            } else {
                var rings = 7;
                for (i = 1; i <= rings; i++) {
                    var level = stats.zmin + (stats.zmax - stats.zmin) * i / (rings + 1);
                    var shade = 0.25 + 0.55 * (i / rings);
                    drawLevelRing(ctx, w, h, cf, pad, level, 'rgba(15,118,110,' + shade.toFixed(2) + ')', 1.15);
                }
            }

            if (opts && opts.peak) {
                var pk = peak(cf);
                if (pk.ok) {
                    drawDot(ctx, mapXY(pk.x, pk.y, w, h, pad), '#0f766e', 6, 'top');
                }
            }

            if (trail.length > 1) {
                ctx.beginPath();
                trail.forEach(function(pt, idx) {
                    var mp = mapXY(pt.x, pt.y, w, h, pad);
                    if (idx === 0) {
                        ctx.moveTo(mp.x, mp.y);
                    } else {
                        ctx.lineTo(mp.x, mp.y);
                    }
                });
                ctx.strokeStyle = 'rgba(30,58,95,0.35)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            var here = mapXY(model.currentX, model.currentY, w, h, pad);
            if (opts && opts.arrow) {
                var sx = slopeX(cf, model.currentX, model.currentY);
                var sy = slopeY(cf, model.currentX, model.currentY);
                var mag = Math.sqrt(sx * sx + sy * sy);
                if (mag > 0.05) {
                    var scale = Math.min(96, Math.max(36, mag * 14));
                    var end = {
                        x: here.x + (sx / mag) * scale,
                        y: here.y - (sy / mag) * scale
                    };
                    ctx.beginPath();
                    ctx.moveTo(here.x, here.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 6;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(here.x, here.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.strokeStyle = '#a3e635';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    drawArrowHead(ctx, here, end, '#a3e635');
                }
            }

            drawDot(ctx, here, '#1e3a5f', 6, 'you');

            ctx.fillStyle = '#334155';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText('puffs per day', pad, h - 8);
            ctx.fillText('teas per day', w - 96, 16);
        }

        function drawCurveB() {
            var canvas = document.getElementById('ws-canvas-b2d');
            var ctx = canvas.getContext('2d');
            var dpr = window.devicePixelRatio || 1;
            var size = canvasSize(canvas);
            var w = size.w;
            var h = size.h;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            var cf = c();
            var n = 80;
            var k;
            var xs = [];
            var zs = [];
            var zmin = Infinity;
            var zmax = -Infinity;
            var frozen = freeze === 'y' ? model.currentY : model.currentX;
            var freeMin = freeze === 'y' ? range.xmin : range.ymin;
            var freeMax = freeze === 'y' ? range.xmax : range.ymax;
            for (k = 0; k <= n; k++) {
                var v = freeMin + (freeMax - freeMin) * k / n;
                var z = freeze === 'y' ? profit(cf, v, frozen) : profit(cf, frozen, v);
                xs.push(v);
                zs.push(z);
                if (z < zmin) {
                    zmin = z;
                }
                if (z > zmax) {
                    zmax = z;
                }
            }
            var pad = 36;
            ctx.beginPath();
            for (k = 0; k <= n; k++) {
                var px = pad + (xs[k] - freeMin) / (freeMax - freeMin || 1) * (w - pad * 2);
                var py = h - pad - (zs[k] - zmin) / (zmax - zmin || 1) * (h - pad * 2);
                if (k === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.strokeStyle = '#0f766e';
            ctx.lineWidth = 2;
            ctx.stroke();

            var cur = freeze === 'y' ? model.currentX : model.currentY;
            var zc = freeze === 'y' ? profit(cf, cur, frozen) : profit(cf, frozen, cur);
            var sl = freeze === 'y' ? slopeX(cf, cur, frozen) : slopeY(cf, cur, frozen);
            var cx = pad + (cur - freeMin) / (freeMax - freeMin || 1) * (w - pad * 2);
            var cy = h - pad - (zc - zmin) / (zmax - zmin || 1) * (h - pad * 2);

            var tlen = (freeMax - freeMin) * 0.18;
            var x1 = cur - tlen;
            var x2 = cur + tlen;
            var z1 = zc + sl * (x1 - cur);
            var z2 = zc + sl * (x2 - cur);
            ctx.beginPath();
            ctx.moveTo(
                pad + (x1 - freeMin) / (freeMax - freeMin || 1) * (w - pad * 2),
                h - pad - (z1 - zmin) / (zmax - zmin || 1) * (h - pad * 2)
            );
            ctx.lineTo(
                pad + (x2 - freeMin) / (freeMax - freeMin || 1) * (w - pad * 2),
                h - pad - (z2 - zmin) / (zmax - zmin || 1) * (h - pad * 2)
            );
            ctx.strokeStyle = sl >= 0 ? '#15803d' : '#d97706';
            ctx.lineWidth = 2.4;
            ctx.stroke();

            drawDot(ctx, {x: cx, y: cy}, '#1e3a5f', 6);

            ctx.fillStyle = '#334155';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(freeze === 'y' ? 'puffs per day' : 'teas per day', pad, h - 8);
            ctx.fillText('profit (₹)', 8, 16);
        }

        function renderA() {
            drawSurface(document.getElementById('ws-canvas-a'), {
                contour: showContourA,
                yaw: yaw,
                peak: true
            });
        }

        function renderB() {
            var frozen = freeze === 'y' ? model.currentY : model.currentX;
            drawSurface(document.getElementById('ws-canvas-b3d'), {
                plane: frozen,
                planeAxis: freeze,
                yaw: yaw,
                coarse: true
            });
            drawCurveB();
            var sl = freeze === 'y'
                ? slopeX(c(), model.currentX, model.currentY)
                : slopeY(c(), model.currentX, model.currentY);
            var kind = freeze === 'y' ? 'puff' : 'tea';
            var el = document.getElementById('ws-slope-b');
            var sentence = slopeSentence(kind, sl);
            el.textContent = 'Slope here — ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
            el.classList.toggle('is-up', sl > 0.005);
            el.classList.toggle('is-down', sl < -0.005);
        }

        function renderC() {
            drawSurface(document.getElementById('ws-canvas-c'), {
                contour: true,
                peak: true,
                arrow: showArrow
            });
            var sx = slopeX(c(), model.currentX, model.currentY);
            var sy = slopeY(c(), model.currentX, model.currentY);
            var slopeC = document.getElementById('ws-slope-c');
            slopeC.innerHTML =
                '<span class="' + (sx > 0.005 ? 'is-up' : sx < -0.005 ? 'is-down' : '') + '">' +
                slopeSentence('puff', sx) + '</span><br>' +
                '<span class="' + (sy > 0.005 ? 'is-up' : sy < -0.005 ? 'is-down' : '') + '">' +
                slopeSentence('tea', sy) + '</span>';
            document.getElementById('ws-slider-x-val').textContent = String(roundUnits(model.currentX));
            document.getElementById('ws-slider-y-val').textContent = String(roundUnits(model.currentY));
        }

        function renderD() {
            drawSurface(document.getElementById('ws-canvas-d'), {
                contour: true,
                peak: true,
                breakEvenOnly: true
            });
            var cf = c();
            var pk = peak(cf);
            if (!pk.ok) {
                return;
            }
            var bestX = roundUnits(pk.x);
            var bestY = roundUnits(pk.y);
            var curP = profit(cf, actuals.x, actuals.y);
            var bestP = profit(cf, pk.x, pk.y);
            var month = roundMonth((bestP - curP) * 30);
            var sx = slopeX(cf, actuals.x, actuals.y);
            var sy = slopeY(cf, actuals.x, actuals.y);
            document.getElementById('ws-reco').textContent =
                'Sell ' + bestX + ' puffs and ' + bestY + ' teas instead of ' +
                roundUnits(actuals.x) + ' and ' + roundUnits(actuals.y) +
                ' — about ' + rupees(month, 0) + ' more per month.';
            document.getElementById('ws-best').textContent = bestX + ' puffs · ' + bestY + ' teas';
            if (sy >= 0) {
                document.getElementById('ws-unit-value').textContent =
                    rupees(sx, 2) + ' puffs · +' + rupees(sy, 2) + ' tea';
            } else {
                document.getElementById('ws-unit-value').textContent =
                    rupees(sx, 2) + ' puffs · ' + rupees(sy, 2) + ' tea';
            }
            var off10 = cf.B * 10 * 10;
            var off50 = cf.B * 50 * 50;
            document.getElementById('ws-off').textContent =
                '10 units off ≈ ' + rupees(off10, 0) + '/day · 50 off ≈ ' + rupees(off50, 0) + '/day';
            document.getElementById('ws-working').textContent =
                'profit(puffs, teas) = ' + cf.A.toFixed(2) + '·puffs − ' + cf.B +
                '·puffs² + ' + cf.C.toFixed(2) + '·teas − ' + cf.D +
                '·teas² − ' + cf.E + '·puffs·teas − ' + cf.F +
                '\n\nBest combination when both slopes are zero: ' +
                bestX + ' puffs, ' + bestY + ' teas.' +
                '\nProfit there: ' + rupees(bestP, 0) +
                '\nProfit at today\'s sales: ' + rupees(curP, 0);
        }

        function renderAll() {
            updateChip();
            updateHere();
            renderA();
            renderB();
            renderC();
            renderD();
        }

        function applyModel(fromForm) {
            if (fromForm !== false && !readForm()) {
                setWarn('Fill in every field before plotting.');
                return false;
            }
            if (!validate()) {
                return false;
            }
            actuals.x = model.currentX;
            actuals.y = model.currentY;
            expandRange();
            document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
            document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
            trail = [{x: model.currentX, y: model.currentY}];
            renderAll();
            return true;
        }

        function loadSample() {
            model = JSON.parse(JSON.stringify(SAMPLE));
            actuals = {x: SAMPLE.currentX, y: SAMPLE.currentY};
            fillForm();
            applyModel(false);
        }

        function showScreen(id) {
            root.querySelectorAll('.cu-ws__screen').forEach(function(el) {
                el.classList.toggle('is-on', el.getAttribute('data-screen') === id);
            });
            root.querySelectorAll('.cu-ws__steps button').forEach(function(btn) {
                btn.classList.toggle('is-on', btn.getAttribute('data-ws-screen') === id);
            });
            var steps = root.querySelector('.cu-ws__steps');
            if (steps && steps.scrollIntoView) {
                steps.scrollIntoView({block: 'start', behavior: 'smooth'});
            }
            window.requestAnimationFrame(function() {
                if (id === 'a') {
                    renderA();
                } else if (id === 'b') {
                    renderB();
                } else if (id === 'c') {
                    renderC();
                } else {
                    renderD();
                }
                updateChip();
                updateHere();
            });
        }

        function syncFreezeLabel() {
            var freezeSlider = document.getElementById('ws-freeze-slider');
            var freeSlider = document.getElementById('ws-free-slider');
            if (freeze === 'y') {
                freezeSlider.min = '0';
                freezeSlider.max = String(Math.round(range.ymax));
                freezeSlider.value = String(roundUnits(model.currentY));
                freeSlider.min = '0';
                freeSlider.max = String(Math.round(range.xmax));
                freeSlider.value = String(roundUnits(model.currentX));
                document.getElementById('ws-freeze-label').textContent =
                    'Freeze an input · teas = ' + roundUnits(model.currentY) + ' · puffs = free';
                document.getElementById('ws-freeze-value').textContent = roundUnits(model.currentY) + ' teas';
                document.getElementById('ws-free-value').textContent = roundUnits(model.currentX) + ' puffs';
                document.getElementById('ws-freeze-slider-name').textContent = 'Teas — held still';
                document.getElementById('ws-free-slider-name').textContent = 'Puffs — can move';
                document.getElementById('ws-hint-b').textContent =
                    'Hold teas still. Only puffs can move. The two pictures are the same slice — hill on the left, ordinary curve on the right. The tilted line is the slope, in rupees.';
            } else {
                freezeSlider.min = '0';
                freezeSlider.max = String(Math.round(range.xmax));
                freezeSlider.value = String(roundUnits(model.currentX));
                freeSlider.min = '0';
                freeSlider.max = String(Math.round(range.ymax));
                freeSlider.value = String(roundUnits(model.currentY));
                document.getElementById('ws-freeze-label').textContent =
                    'Freeze an input · puffs = ' + roundUnits(model.currentX) + ' · teas = free';
                document.getElementById('ws-freeze-value').textContent = roundUnits(model.currentX) + ' puffs';
                document.getElementById('ws-free-value').textContent = roundUnits(model.currentY) + ' teas';
                document.getElementById('ws-freeze-slider-name').textContent = 'Puffs — held still';
                document.getElementById('ws-free-slider-name').textContent = 'Teas — can move';
                document.getElementById('ws-hint-b').textContent =
                    'Hold puffs still. Only teas can move. The two pictures are the same slice — hill on the left, ordinary curve on the right. The tilted line is the slope, in rupees.';
            }
        }

        function pushTrail() {
            var last = trail[trail.length - 1];
            if (!last || last.x !== model.currentX || last.y !== model.currentY) {
                trail.push({x: model.currentX, y: model.currentY});
                if (trail.length > 80) {
                    trail.shift();
                }
            }
        }

        root.querySelectorAll('[data-ws-screen]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                showScreen(btn.getAttribute('data-ws-screen'));
            });
        });

        document.getElementById('ws-sample').addEventListener('click', loadSample);
        document.getElementById('ws-plot').addEventListener('click', applyModel);
        document.getElementById('ws-reset-a').addEventListener('click', loadSample);
        document.getElementById('ws-toggle-view').addEventListener('click', function() {
            showContourA = !showContourA;
            this.textContent = showContourA ? 'Show the hill' : 'Show map from above';
            renderA();
        });

        document.getElementById('ws-swap').addEventListener('click', function() {
            freeze = freeze === 'y' ? 'x' : 'y';
            syncFreezeLabel();
            renderB();
        });

        document.getElementById('ws-freeze-slider').addEventListener('input', function() {
            var v = Number(this.value);
            if (freeze === 'y') {
                model.currentY = v;
            } else {
                model.currentX = v;
            }
            document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
            document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
            syncFreezeLabel();
            updateChip();
            renderB();
        });

        document.getElementById('ws-free-slider').addEventListener('input', function() {
            var v = Number(this.value);
            if (freeze === 'y') {
                model.currentX = v;
            } else {
                model.currentY = v;
            }
            document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
            document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
            syncFreezeLabel();
            updateChip();
            renderB();
        });

        document.getElementById('ws-slider-x').addEventListener('input', function() {
            model.currentX = Number(this.value);
            form.elements.currentX.value = model.currentX;
            pushTrail();
            updateChip();
            renderC();
        });
        document.getElementById('ws-slider-y').addEventListener('input', function() {
            model.currentY = Number(this.value);
            form.elements.currentY.value = model.currentY;
            pushTrail();
            updateChip();
            renderC();
        });

        document.getElementById('ws-arrow').addEventListener('click', function() {
            showArrow = !showArrow;
            this.textContent = showArrow ? 'Hide uphill arrow' : 'Show uphill arrow';
            renderC();
        });

        document.getElementById('ws-reset-c').addEventListener('click', function() {
            model.currentX = actuals.x;
            model.currentY = actuals.y;
            document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
            document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
            trail = [{x: model.currentX, y: model.currentY}];
            document.getElementById('ws-solve-pair').hidden = true;
            renderAll();
        });

        document.getElementById('ws-solve').addEventListener('click', function() {
            var pk = peak(c());
            if (!pk.ok) {
                return;
            }
            var from = {x: model.currentX, y: model.currentY, p: profit(c(), model.currentX, model.currentY)};
            var to = {x: pk.x, y: pk.y, p: profit(c(), pk.x, pk.y)};
            var start = performance.now();
            var done = false;
            function finish() {
                if (done) {
                    return;
                }
                done = true;
                model.currentX = to.x;
                model.currentY = to.y;
                document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
                document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
                var pair = document.getElementById('ws-solve-pair');
                pair.hidden = false;
                pair.textContent = rupees(from.p, 0) + ' → ' + rupees(to.p, 0);
                updateChip();
                renderC();
            }
            function tick() {
                if (done) {
                    return;
                }
                var t = Math.min(1, (performance.now() - start) / 1100);
                var e = 1 - Math.pow(1 - t, 3);
                model.currentX = from.x + (to.x - from.x) * e;
                model.currentY = from.y + (to.y - from.y) * e;
                document.getElementById('ws-slider-x').value = String(roundUnits(model.currentX));
                document.getElementById('ws-slider-y').value = String(roundUnits(model.currentY));
                pushTrail();
                updateChip();
                renderC();
                if (t < 1) {
                    window.setTimeout(tick, 16);
                } else {
                    finish();
                }
            }
            tick();
        });

        document.getElementById('ws-export').addEventListener('click', function() {
            showScreen('d');
            window.setTimeout(function() {
                window.print();
            }, 80);
        });

        document.getElementById('ws-share').addEventListener('click', function() {
            var text = document.getElementById('ws-reco').textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
                this.textContent = 'Copied';
                var btn = this;
                setTimeout(function() {
                    btn.textContent = 'Share';
                }, 1500);
            }
        });

        var working = document.getElementById('ws-working-wrap');
        if (working) {
            try {
                working.open = window.localStorage.getItem('cu-ws-working') === '1';
            } catch (e) {
                // localStorage may be blocked.
            }
            working.addEventListener('toggle', function() {
                try {
                    window.localStorage.setItem('cu-ws-working', working.open ? '1' : '0');
                } catch (e2) {
                    // Ignore.
                }
            });
        }

        var drag3d = null;
        ['ws-canvas-a', 'ws-canvas-b3d'].forEach(function(id) {
            var el = document.getElementById(id);
            el.addEventListener('pointerdown', function(ev) {
                drag3d = {x: ev.clientX, yaw0: yaw};
                el.setPointerCapture(ev.pointerId);
            });
            el.addEventListener('pointermove', function(ev) {
                if (!drag3d) {
                    return;
                }
                yaw = drag3d.yaw0 + (ev.clientX - drag3d.x) / 220;
                if (el.id === 'ws-canvas-a') {
                    renderA();
                } else {
                    renderB();
                }
            });
            el.addEventListener('pointerup', function() {
                drag3d = null;
                var start = yaw;
                var t0 = performance.now();
                function snap(now) {
                    var t = Math.min(1, (now - t0) / 280);
                    yaw = start * (1 - t);
                    if (el.id === 'ws-canvas-a') {
                        renderA();
                    } else {
                        renderB();
                    }
                    if (t < 1) {
                        requestAnimationFrame(snap);
                    }
                }
                requestAnimationFrame(snap);
            });
        });

        window.addEventListener('resize', function() {
            renderAll();
        });

        var check = coeffs(SAMPLE);
        if (Math.abs(profit(check, 200, 150) - 1475) > 0.51) {
            window.console.error('Workshop profit check failed', profit(check, 200, 150));
        }

        loadSample();
        showScreen('a');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
