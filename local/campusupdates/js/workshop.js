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
            warn = 'With these numbers the best you can do is stop selling the first product.';
        }
        if (y < 0) {
            y = 0;
            warn = (warn ? warn + ' ' : '') + 'With these numbers the best you can do is stop selling the second product.';
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
        var showContourFn = false;
        var showArrow = true;
        var trail = [];
        var yaw = 0;
        var range = {xmin: 0, xmax: 400, ymin: 0, ymax: 500};
        var mode = root.getAttribute('data-mode') === 'advanced' ? 'advanced' : 'simple';
        var mapped = {x: false, y: false, z: false};
        var checkpoint = {found: false};
        var mark = {x: SAMPLE.currentX, y: SAMPLE.currentY};

        function isAdvanced() {
            return mode === 'advanced';
        }

        function oneWord(name) {
            var s = String(name || '').trim();
            if (/s$/i.test(s) && s.length > 3) {
                return s.replace(/s$/i, '');
            }
            return s || 'unit';
        }

        function L() {
            var lab = (model && model.labels) || FALLBACK.labels;
            var p1 = lab.product1 || 'puffs';
            var p2 = lab.product2 || 'teas';
            return {
                p1: p1,
                p2: p2,
                one1: lab.one1 || oneWord(p1),
                one2: lab.one2 || oneWord(p2),
                unit1: lab.unit1 || (p1 + ' per day'),
                unit2: lab.unit2 || (p2 + ' per day'),
                currency: lab.currency || '₹'
            };
        }

        function applyLabels() {
            var l = L();
            function setText(id, text) {
                var el = document.getElementById(id);
                if (el) {
                    el.textContent = text;
                }
            }
            setText('ws-leg-1', l.p1.charAt(0).toUpperCase() + l.p1.slice(1));
            setText('ws-leg-2', l.p2.charAt(0).toUpperCase() + l.p2.slice(1));
            setText('ws-lab-x', 'What we sell today — ' + l.p1);
            setText('ws-lab-y', 'What we sell today — ' + l.p2);
            setText('ws-walk-x-name', l.unit1);
            setText('ws-walk-y-name', l.unit2);
            setText('ws-mark-x-name', l.p1.charAt(0).toUpperCase() + l.p1.slice(1));
            setText('ws-mark-y-name', l.p2.charAt(0).toUpperCase() + l.p2.slice(1));
            setText('ws-q-leg-1', l.p1.charAt(0).toUpperCase() + l.p1.slice(1));
            setText('ws-q-leg-2', l.p2.charAt(0).toUpperCase() + l.p2.slice(1));
            root.querySelectorAll('button[data-slot="p1"]').forEach(function(btn) {
                btn.setAttribute('data-choice', l.p1);
                btn.textContent = 'how many ' + l.p1 + ' we sell';
            });
            root.querySelectorAll('button[data-slot="p2"]').forEach(function(btn) {
                btn.setAttribute('data-choice', l.p2);
                btn.textContent = 'how many ' + l.p2 + ' we sell';
            });
            mapAnswers = {x: l.p1, y: l.p2, z: 'profit'};
        }

        var unlocked = isAdvanced()
            ? {model: true, function: false, compare: false, tools: false, make: false}
            : {a: true, b: false, c: false, d: false, make: false};
        var walked = false;
        var bPass = false;
        var pPass = false;
        var scenario = JSON.parse(JSON.stringify(SAMPLE));
        var mapAnswers = {x: 'puffs', y: 'teas', z: 'profit'};

        function axisX() {
            var l = L();
            return isAdvanced() ? 'x (' + l.unit1 + ')' : l.unit1;
        }

        function axisY() {
            var l = L();
            return isAdvanced() ? 'y (' + l.unit2 + ')' : l.unit2;
        }

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
            var markX = document.getElementById('ws-mark-x');
            var markY = document.getElementById('ws-mark-y');
            if (markX) {
                markX.max = String(Math.round(range.xmax));
            }
            if (markY) {
                markY.max = String(Math.round(range.ymax));
            }
            var makeX = document.getElementById('ws-make-x');
            var makeY = document.getElementById('ws-make-y');
            if (makeX) {
                makeX.max = String(Math.round(range.xmax));
            }
            if (makeY) {
                makeY.max = String(Math.round(range.ymax));
            }
            var peakX = document.getElementById('ws-make-peak-x');
            var peakY = document.getElementById('ws-make-peak-y');
            if (peakX) {
                peakX.max = String(Math.round(range.xmax));
            }
            if (peakY) {
                peakY.max = String(Math.round(range.ymax));
            }
            syncFreezeLabel();
        }

        function fillForm() {
            fields.forEach(function(k) {
                form.elements[k].value = model[k];
                form.elements[k].classList.remove('is-blank');
            });
            var nameEl = document.getElementById('ws-model-name');
            if (nameEl) {
                nameEl.textContent = model.name || 'Custom shop';
            }
            var resetBtn = document.getElementById('ws-reset-a');
            if (resetBtn) {
                resetBtn.textContent = 'Reset this shop';
            }
            var sampleBtn = document.getElementById('ws-sample');
            if (sampleBtn) {
                sampleBtn.textContent = 'Reload this shop';
            }
            applyLabels();
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
                msgs.push('Congestion is zero — the two products no longer affect each other. The landscape becomes two independent problems.');
            }
            if (model.price1 < model.cost1) {
                msgs.push('You lose money on every ' + L().one1 + '.');
            }
            if (model.price2 < model.cost2) {
                msgs.push('You lose money on every ' + L().one2 + '.');
            }
            if (pk.warn) {
                msgs.push(pk.warn);
            }
            setWarn(msgs.join(' '));
            return true;
        }

        function updateChip() {
            var p = profit(c(), model.currentX, model.currentY);
            profitChip.textContent = 'Profit · ' + rupees(p, 0);
        }

        function updateHere() {
            document.getElementById('ws-here-a').textContent =
                'You are here — ' + roundUnits(model.currentX) + ' ' + L().p1 + ', ' +
                roundUnits(model.currentY) + ' ' + L().p2;
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
            ctx.fillText(axisX(), 12, h - 10);
            ctx.fillText(axisY(), w - 108, h - 10);
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

            if (trail.length > 1 && !(opts && opts.noTrail)) {
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

            var pos = (opts && opts.here) ? opts.here : {x: model.currentX, y: model.currentY};
            var here = mapXY(pos.x, pos.y, w, h, pad);
            if (opts && opts.arrow) {
                var sx = slopeX(cf, pos.x, pos.y);
                var sy = slopeY(cf, pos.x, pos.y);
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

            if (opts && opts.guess) {
                drawDot(ctx, mapXY(opts.guess.x, opts.guess.y, w, h, pad), '#b45309', 8, 'your mark');
            }

            drawDot(ctx, here, '#1e3a5f', 6, 'you');

            ctx.fillStyle = '#334155';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(axisX(), pad, h - 8);
            ctx.fillText(axisY(), w - 108, 16);
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
            ctx.fillText(freeze === 'y' ? axisX() : axisY(), pad, h - 8);
            ctx.fillText(isAdvanced() ? 'P' : 'profit (₹)', 8, 16);
        }

        function renderA() {
            var canvas = document.getElementById('ws-canvas-a');
            if (!canvas) {
                return;
            }
            drawSurface(canvas, {
                contour: showContourA,
                yaw: yaw,
                peak: !isAdvanced()
            });
        }

        function renderFn() {
            var canvas = document.getElementById('ws-canvas-fn');
            if (!canvas) {
                return;
            }
            drawSurface(canvas, {
                contour: showContourFn,
                yaw: yaw,
                peak: false
            });
            var cf = c();
            var stats = gridStats(cf);
            var pk = peak(cf);
            var supEl = document.getElementById('ws-sup');
            var infEl = document.getElementById('ws-inf');
            if (pk.ok) {
                supEl.textContent = rupees(profit(cf, pk.x, pk.y), 0) +
                    ' at ' + roundUnits(pk.x) + ' ' + L().p1 + ' · ' + roundUnits(pk.y) + ' ' + L().p2;
            } else {
                supEl.textContent = rupees(stats.zmax, 0);
            }
            infEl.textContent = rupees(stats.zmin, 0) + ' on the axes we drew';
            var formula = document.getElementById('ws-fn-formula');
            if (formula) {
                formula.textContent = 'P(x, y) = ' + cf.A.toFixed(2) + 'x − ' + cf.B +
                    'x² + ' + cf.C.toFixed(2) + 'y − ' + cf.D + 'y² − ' + cf.E + 'xy − ' + cf.F;
            }
        }

        function renderCompare() {
            var canvas = document.getElementById('ws-canvas-compare');
            if (!canvas) {
                return;
            }
            drawSurface(canvas, {
                contour: true,
                peak: checkpoint.found,
                here: actuals,
                guess: mark,
                noTrail: true
            });
            var profitEl = document.getElementById('ws-mark-profit');
            if (profitEl) {
                profitEl.textContent = 'Profit at your mark · ' + rupees(profit(c(), mark.x, mark.y), 0);
            }
            var xv = document.getElementById('ws-mark-x-val');
            var yv = document.getElementById('ws-mark-y-val');
            if (xv) {
                xv.textContent = String(roundUnits(mark.x));
            }
            if (yv) {
                yv.textContent = String(roundUnits(mark.y));
            }
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
            var kind = freeze === 'y' ? L().one1 : L().one2;
            var el = document.getElementById('ws-slope-b');
            var sentence = slopeSentence(kind, sl);
            if (isAdvanced()) {
                el.textContent = (freeze === 'y' ? '∂P/∂x  — ' : '∂P/∂y  — ') +
                    sentence.charAt(0).toLowerCase() + sentence.slice(1);
            } else {
                el.textContent = 'Slope here — ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
            }
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
                slopeSentence(L().one1, sx) + '</span><br>' +
                '<span class="' + (sy > 0.005 ? 'is-up' : sy < -0.005 ? 'is-down' : '') + '">' +
                slopeSentence(L().one2, sy) + '</span>';
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
                'Sell ' + bestX + ' ' + L().p1 + ' and ' + bestY + ' ' + L().p2 + ' instead of ' +
                roundUnits(actuals.x) + ' and ' + roundUnits(actuals.y) +
                ' — about ' + rupees(month, 0) + ' more per month.';
            document.getElementById('ws-best').textContent = bestX + ' ' + L().p1 + ' · ' + bestY + ' ' + L().p2;
            if (sy >= 0) {
                document.getElementById('ws-unit-value').textContent =
                    rupees(sx, 2) + ' ' + L().p1 + ' · +' + rupees(sy, 2) + ' ' + L().one2;
            } else {
                document.getElementById('ws-unit-value').textContent =
                    rupees(sx, 2) + ' ' + L().p1 + ' · ' + rupees(sy, 2) + ' ' + L().one2;
            }
            var off10 = cf.B * 10 * 10;
            var off50 = cf.B * 50 * 50;
            document.getElementById('ws-off').textContent =
                '10 units off ≈ ' + rupees(off10, 0) + '/day · 50 off ≈ ' + rupees(off50, 0) + '/day';
            document.getElementById('ws-working').textContent =
                'profit(' + L().p1 + ', ' + L().p2 + ') = ' + cf.A.toFixed(2) + '·' + L().p1 + ' − ' + cf.B +
                '·' + L().p1 + '² + ' + cf.C.toFixed(2) + '·' + L().p2 + ' − ' + cf.D +
                '·' + L().p2 + '² − ' + cf.E + '·' + L().p1 + '·' + L().p2 + ' − ' + cf.F +
                '\n\nBest combination when both slopes are zero: ' +
                bestX + ' ' + L().p1 + ', ' + bestY + ' ' + L().p2 + '.' +
                '\nProfit there: ' + rupees(bestP, 0) +
                '\nProfit at today\'s sales: ' + rupees(curP, 0);
        }

        function renderAll() {
            updateChip();
            updateHere();
            updateEquation();
            updateBiz();
            updateReveal();
            renderA();
            renderFn();
            renderCompare();
            renderMake();
            renderB();
            renderC();
            renderD();
        }

        function setStepEnabled(id, on) {
            unlocked[id] = !!on;
            root.querySelectorAll('[data-ws-screen="' + id + '"]').forEach(function(btn) {
                btn.disabled = !on;
            });
        }

        function unlock(id) {
            setStepEnabled(id, true);
            updateProgress();
        }

        function celebrate(msg) {
            var toast = document.getElementById('ws-toast');
            if (!toast) {
                return;
            }
            toast.textContent = msg;
            toast.hidden = false;
            toast.classList.add('is-on');
            window.setTimeout(function() {
                toast.classList.remove('is-on');
                toast.hidden = true;
            }, 1600);
        }

        function updateProgress() {
            var order = isAdvanced()
                ? ['model', 'function', 'compare', 'tools', 'make']
                : ['a', 'b', 'c', 'd', 'make'];
            var labels = isAdvanced()
                ? ['Equation', 'Letters', 'The top', 'Partials', 'Your Q']
                : ['Hill', 'Slope', 'Walk', 'Result', 'Your Q'];
            var on = root.querySelector('.cu-ws__screen.is-on');
            var id = on ? on.getAttribute('data-screen') : order[0];
            var idx = order.indexOf(id);
            var round = document.getElementById('ws-round');
            if (round && idx >= 0) {
                round.textContent = 'Round ' + (idx + 1) + ' of ' + order.length + ' · ' + labels[idx];
            }
            order.forEach(function(sid, i) {
                var btn = root.querySelector('.cu-ws__steps button[data-ws-screen="' + sid + '"]');
                if (!btn) {
                    return;
                }
                btn.classList.toggle('is-done', !!unlocked[sid] && i < idx);
            });
        }

        function updateEquation() {
            var cf = c();
            var x = model.currentX;
            var y = model.currentY;
            var xr = roundUnits(x);
            var yr = roundUnits(y);
            var p = profit(cf, x, y);
            var n1 = (model.price1 - model.priceDrop1 * x - model.cost1) * x;
            var n2 = (model.price2 - model.priceDrop2 * y - model.cost2) * y;
            var nCong = model.congestion * x * y;
            var lab = L();
            var t1 = cf.A * x;
            var t2 = cf.B * x * x;
            var t3 = cf.C * y;
            var t4 = cf.D * y * y;
            var t5 = cf.E * x * y;
            var simple = document.getElementById('ws-eq-simple');
            if (simple) {
                simple.innerHTML =
                    '<p class="cu-ws__eq-main">Profit = money from ' + lab.p1 + ' + money from ' + lab.p2 +
                    ' − congestion − rent</p>' +
                    '<table class="cu-ws__eq-table">' +
                    '<tr><th>Money from ' + lab.p1 + '</th><td>(starting price − drop × ' + lab.p1 +
                    ' − cost) × ' + lab.p1 + '</td></tr>' +
                    '<tr><th>Put numbers in</th><td>(' + model.price1 + ' − ' + model.priceDrop1 +
                    ' × ' + xr + ' − ' + model.cost1 + ') × ' + xr + ' = ' + rupees(n1, 0) + '</td></tr>' +
                    '<tr><th>Money from ' + lab.p2 + '</th><td>(starting price − drop × ' + lab.p2 +
                    ' − cost) × ' + lab.p2 + '</td></tr>' +
                    '<tr><th>Put numbers in</th><td>(' + model.price2 + ' − ' + model.priceDrop2 +
                    ' × ' + yr + ' − ' + model.cost2 + ') × ' + yr + ' = ' + rupees(n2, 0) + '</td></tr>' +
                    '<tr><th>Congestion</th><td>congestion × ' + lab.p1 + ' × ' + lab.p2 + '</td></tr>' +
                    '<tr><th>Put numbers in</th><td>' + model.congestion + ' × ' + xr + ' × ' + yr +
                    ' = ' + rupees(nCong, 0) + '</td></tr>' +
                    '<tr><th>Rent</th><td>' + rupees(model.fixedCost, 0) + '</td></tr>' +
                    '</table>' +
                    '<p class="cu-ws__eq-today">Today: ' + xr + ' ' + lab.p1 + ' and ' + yr + ' ' + lab.p2 +
                    ' → profit ' + rupees(n1, 0) + ' + ' + rupees(n2, 0) + ' − ' + rupees(nCong, 0) +
                    ' − ' + rupees(model.fixedCost, 0) + ' = <strong>' + rupees(p, 0) + '</strong></p>';
            }
            var main = document.getElementById('ws-eq-main');
            if (main) {
                main.textContent = 'P(x, y) = A x − B x² + C y − D y² − E x y − F';
            }
            var map = document.getElementById('ws-eq-map');
            if (map) {
                map.innerHTML =
                    '<table class="cu-ws__eq-table">' +
                    '<tr><th>Letter</th><th>What it is</th><th>Number in that place</th></tr>' +
                    '<tr><td>x</td><td>' + lab.unit1 + '</td><td>' + xr + '</td></tr>' +
                    '<tr><td>y</td><td>' + lab.unit2 + '</td><td>' + yr + '</td></tr>' +
                    '<tr><td>A</td><td>' + lab.one1 + ' starting price − cost</td><td>' +
                    model.price1 + ' − ' + model.cost1 + ' = ' + cf.A.toFixed(2) + '</td></tr>' +
                    '<tr><td>B</td><td>' + lab.one1 + ' price drop per extra unit</td><td>' + cf.B + '</td></tr>' +
                    '<tr><td>C</td><td>' + lab.one2 + ' starting price − cost</td><td>' +
                    model.price2 + ' − ' + model.cost2 + ' = ' + cf.C.toFixed(2) + '</td></tr>' +
                    '<tr><td>D</td><td>' + lab.one2 + ' price drop per extra unit</td><td>' + cf.D + '</td></tr>' +
                    '<tr><td>E</td><td>congestion</td><td>' + cf.E + '</td></tr>' +
                    '<tr><td>F</td><td>rent and salaries</td><td>' + cf.F + '</td></tr>' +
                    '</table>';
            }
            var sub = document.getElementById('ws-eq-sub');
            if (sub) {
                sub.textContent = 'P(x, y) = ' + cf.A.toFixed(2) + ' x − ' + cf.B +
                    ' x² + ' + cf.C.toFixed(2) + ' y − ' + cf.D + ' y² − ' + cf.E + ' x y − ' + cf.F;
            }
            var plug = document.getElementById('ws-eq-plug');
            if (plug) {
                plug.innerHTML =
                    'x = ' + xr + ' (' + lab.p1 + '), y = ' + yr + ' (' + lab.p2 + ')<br>' +
                    'P(' + xr + ', ' + yr + ') = ' + cf.A.toFixed(2) + '(' + xr + ') − ' + cf.B +
                    '(' + xr + ')² + ' + cf.C.toFixed(2) + '(' + yr + ') − ' + cf.D + '(' + yr +
                    ')² − ' + cf.E + '(' + xr + ')(' + yr + ') − ' + cf.F + '<br>' +
                    '= ' + rupees(t1, 0) + ' − ' + rupees(t2, 0) + ' + ' + rupees(t3, 0) +
                    ' − ' + rupees(t4, 0) + ' − ' + rupees(t5, 0) + ' − ' + rupees(cf.F, 0) +
                    '<br>= <strong>' + rupees(p, 0) + '</strong>';
            }
        }

        function updateBiz() {
            var el = document.getElementById('ws-biz-copy');
            if (!el) {
                return;
            }
            var p = profit(c(), actuals.x, actuals.y);
            el.textContent = 'Today the shop sells ' + roundUnits(actuals.x) +
                ' ' + L().p1 + ' and ' + roundUnits(actuals.y) + ' ' + L().p2 + '. That mix makes ' +
                rupees(p, 0) + '. Move your mark to the mix that makes the most money, then press the button.';
        }

        function updateReveal() {
            var el = document.getElementById('ws-reveal-adv');
            if (!el) {
                return;
            }
            var cf = c();
            var pk = peak(cf);
            var sx0 = slopeX(cf, actuals.x, actuals.y);
            var sy0 = slopeY(cf, actuals.x, actuals.y);
            var peakText = pk.ok
                ? '(' + roundUnits(pk.x) + ', ' + roundUnits(pk.y) + '), P = ' + rupees(profit(cf, pk.x, pk.y), 0)
                : 'undefined';
            el.innerHTML =
                '<div class="cu-ws__facts">' +
                '<article><h3>Partial</h3><p>Hold one still. That slope is ∂P/∂x or ∂P/∂y.</p></article>' +
                '<article><h3>Today</h3><p>x = ' + roundUnits(actuals.x) + ', y = ' +
                roundUnits(actuals.y) + ' → ∂P/∂x = ' + sx0.toFixed(2) +
                ', ∂P/∂y = ' + sy0.toFixed(2) + '</p></article>' +
                '<article><h3>Top</h3><p>Both zero at ' + peakText +
                '. den = ' + (pk.ok ? pk.den.toFixed(4) : pk.den) +
                (pk.ok && pk.den > 0 ? ' &gt; 0 so it is a hill, not a saddle.' : '.') +
                '</p></article></div>';
        }

        function resetChoice(id) {
            var box = document.getElementById(id);
            if (!box) {
                return;
            }
            box.querySelectorAll('button').forEach(function(b) {
                b.classList.remove('is-right', 'is-wrong');
            });
        }

        function freeSlope() {
            return freeze === 'y'
                ? slopeX(c(), model.currentX, model.currentY)
                : slopeY(c(), model.currentX, model.currentY);
        }

        function updateBCheckQuestion() {
            var q = document.getElementById('ws-b-check-q');
            if (!q) {
                return;
            }
            var extra = freeze === 'y' ? L().one1 : L().one2;
            var held = freeze === 'y' ? L().p2 : L().p1;
            q.textContent = 'At today’s mix, if you sell one extra ' + extra +
                ' and keep ' + held + ' the same, profit…';
        }

        function fillPCheck() {
            var wrap = document.getElementById('ws-p-check-btns');
            var status = document.getElementById('ws-p-check-status');
            var q = document.getElementById('ws-p-check-q');
            if (!wrap) {
                return;
            }
            var today = Math.round(profit(c(), actuals.x, actuals.y));
            var pk = peak(c());
            var peakP = pk.ok ? Math.round(profit(c(), pk.x, pk.y)) : today + 250;
            var opts = [today, peakP, Math.round(c().F), Math.round(c().A * actuals.x)];
            var uniq = [];
            opts.forEach(function(n) {
                if (uniq.indexOf(n) === -1) {
                    uniq.push(n);
                }
            });
            while (uniq.length < 3) {
                uniq.push(uniq[0] + 125 * uniq.length);
            }
            uniq.sort(function() {
                return Math.random() - 0.5;
            });
            wrap.innerHTML = '';
            uniq.forEach(function(n) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.setAttribute('data-val', String(n));
                btn.textContent = rupees(n, 0);
                wrap.appendChild(btn);
            });
            if (q) {
                q.textContent = 'Using that substitution, P(' +
                    roundUnits(actuals.x) + ', ' + roundUnits(actuals.y) + ') is';
            }
            if (status) {
                status.textContent = 'Pick the value that matches the last line of the working.';
                status.classList.remove('is-ok');
            }
            wrap.querySelectorAll('button').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var ok = Number(btn.getAttribute('data-val')) === today;
                    wrap.querySelectorAll('button').forEach(function(b) {
                        b.classList.remove('is-right', 'is-wrong');
                    });
                    btn.classList.add(ok ? 'is-right' : 'is-wrong');
                    if (ok) {
                        pPass = true;
                        status.textContent = 'Yes — that is today’s profit from the equation.';
                        status.classList.add('is-ok');
                        celebrate('Nice — the equation matches the shop.');
                        unlock('function');
                    } else {
                        status.textContent = 'Not that one. Follow the last line: put x and y into P, then add the terms.';
                        status.classList.remove('is-ok');
                    }
                });
            });
        }

        function makeKind() {
            var sel = document.getElementById('ws-make-kind');
            return sel ? sel.value : 'slope';
        }

        function makeAxis() {
            var sel = document.getElementById('ws-make-axis');
            return sel && sel.value === 'y' ? 'y' : 'x';
        }

        function suggestedPrompt() {
            var xr = roundUnits(qmix.x);
            var yr = roundUnits(qmix.y);
            var kind = makeKind();
            var product = makeAxis() === 'y' ? 'tea' : 'puff';
            var held = makeAxis() === 'y' ? 'puffs' : 'teas';
            if (kind === 'profit') {
                return 'Look at the graph. The shop is at ' + xr + ' puffs and ' + yr +
                    ' teas. What is profit at this mix?';
            }
            if (kind === 'peak') {
                return 'On this profit map, mark the mix that makes the most money. You do not need a pixel-perfect hit.';
            }
            if (kind === 'which') {
                return 'The shop is at ' + xr + ' puffs and ' + yr +
                    ' teas. To raise profit, should it sell more puffs, more teas, neither, or is it already at the top?';
            }
            return 'Look at the graph. The shop is at ' + xr + ' puffs and ' + yr +
                ' teas. If it sells one extra ' + product + ' and keeps ' + held +
                ' the same, does profit go up, go down, or stay the same?';
        }

        function slopeAtMix(axis) {
            return axis === 'y'
                ? slopeY(c(), qmix.x, qmix.y)
                : slopeX(c(), qmix.x, qmix.y);
        }

        function slopeBucket(value) {
            if (value > 0.2) {
                return 'up';
            }
            if (value < -0.2) {
                return 'down';
            }
            return 'flat';
        }

        function whichAnswer() {
            var sx = slopeX(c(), qmix.x, qmix.y);
            var sy = slopeY(c(), qmix.x, qmix.y);
            if (Math.abs(sx) < 0.2 && Math.abs(sy) < 0.2) {
                return 'flat';
            }
            if (sx <= 0.2 && sy <= 0.2) {
                return 'neither';
            }
            if (sx >= sy) {
                return 'x';
            }
            return 'y';
        }

        function makeKeyText() {
            var kind = makeKind();
            var xr = roundUnits(qmix.x);
            var yr = roundUnits(qmix.y);
            var p = profit(c(), qmix.x, qmix.y);
            var pk = peak(c());
            if (kind === 'profit') {
                return 'Answer key: profit at ' + xr + ' puffs · ' + yr + ' teas is ' + rupees(p, 0) + '.';
            }
            if (kind === 'peak') {
                if (!pk.ok) {
                    return 'Answer key: these numbers do not have a single top.';
                }
                return 'Answer key: the top is ' + roundUnits(pk.x) + ' puffs · ' +
                    roundUnits(pk.y) + ' teas (' + rupees(profit(c(), pk.x, pk.y), 0) + ').';
            }
            if (kind === 'which') {
                var w = whichAnswer();
                var map = {
                    x: 'sell more puffs (the puff slope is the uphill one)',
                    y: 'sell more teas (the tea slope is the uphill one)',
                    neither: 'neither — extra units of both lose money',
                    flat: 'already at the top — both slopes are quiet'
                };
                return 'Answer key: ' + map[w] + '.';
            }
            var sl = slopeAtMix(makeAxis());
            var extra = makeAxis() === 'y' ? 'tea' : 'puff';
            return 'Answer key: ' + slopeSentence(extra, sl);
        }

        function makeWarn() {
            var el = document.getElementById('ws-make-warn');
            if (!el) {
                return;
            }
            var kind = makeKind();
            var msg = '';
            if (kind === 'slope' && slopeBucket(slopeAtMix(makeAxis())) === 'flat') {
                msg = 'Both slopes are quiet here, so a classmate will say “stays the same.” Move the mix if you want a clearer up/down question.';
            }
            if (kind === 'which' && whichAnswer() === 'flat') {
                msg = 'This mix is already at the top. Move it if you want the question to be about selling more of one product.';
            }
            el.hidden = !msg;
            el.textContent = msg;
        }

        function fillMakePrompt() {
            var box = document.getElementById('ws-make-prompt');
            if (!box || makePromptDirty) {
                return;
            }
            box.value = suggestedPrompt();
        }

        function setMakeTrying(on) {
            makeTrying = !!on;
            var tryBtn = document.getElementById('ws-make-try');
            var editBtn = document.getElementById('ws-make-edit');
            var key = document.getElementById('ws-make-key');
            var box = document.getElementById('ws-make-trybox');
            var build = document.querySelector('.cu-ws__make-build');
            if (tryBtn) {
                tryBtn.hidden = makeTrying;
            }
            if (editBtn) {
                editBtn.hidden = !makeTrying;
            }
            if (key) {
                key.hidden = makeTrying;
            }
            if (box) {
                box.hidden = !makeTrying;
            }
            if (build) {
                build.querySelectorAll('select, textarea, #ws-make-x, #ws-make-y').forEach(function(el) {
                    el.disabled = makeTrying;
                });
            }
            if (makeTrying) {
                var stem = document.getElementById('ws-make-stem');
                var prompt = document.getElementById('ws-make-prompt');
                if (stem && prompt) {
                    stem.textContent = prompt.value || suggestedPrompt();
                }
                var kind = makeKind();
                ['slope', 'profit', 'which', 'peak'].forEach(function(k) {
                    var panel = document.getElementById('ws-make-try-' + k);
                    if (panel) {
                        panel.hidden = k !== kind;
                    }
                });
                var status = document.getElementById('ws-make-try-status');
                if (status) {
                    status.textContent = 'Answer using the graph.';
                    status.classList.remove('is-ok');
                }
                if (kind === 'profit') {
                    fillMakeProfitChoices();
                }
                makeGuess = {x: qmix.x, y: qmix.y};
                var px = document.getElementById('ws-make-peak-x');
                var py = document.getElementById('ws-make-peak-y');
                if (px) {
                    px.value = String(roundUnits(makeGuess.x));
                }
                if (py) {
                    py.value = String(roundUnits(makeGuess.y));
                }
            }
            renderMake();
        }

        function fillMakeProfitChoices() {
            var wrap = document.getElementById('ws-make-try-profit');
            if (!wrap) {
                return;
            }
            var today = Math.round(profit(c(), qmix.x, qmix.y));
            var pk = peak(c());
            var peakP = pk.ok ? Math.round(profit(c(), pk.x, pk.y)) : today + 200;
            var opts = [today, peakP, Math.round(c().F), Math.round(today * 0.6)];
            var uniq = [];
            opts.forEach(function(n) {
                if (uniq.indexOf(n) === -1) {
                    uniq.push(n);
                }
            });
            uniq.sort(function() {
                return Math.random() - 0.5;
            });
            wrap.innerHTML = '';
            uniq.forEach(function(n) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.setAttribute('data-try', String(n));
                btn.textContent = rupees(n, 0);
                wrap.appendChild(btn);
            });
        }

        function packScenario(raw, labels) {
            return {
                name: raw.name,
                price1: Number(raw.price1),
                priceDrop1: Number(raw.priceDrop1),
                cost1: Number(raw.cost1),
                price2: Number(raw.price2),
                priceDrop2: Number(raw.priceDrop2),
                cost2: Number(raw.cost2),
                congestion: Number(raw.congestion),
                fixedCost: Number(raw.fixedCost),
                currentX: Number(raw.currentX),
                currentY: Number(raw.currentY),
                labels: labels
            };
        }

        var PRESETS = {
            bakery: JSON.parse(JSON.stringify(FALLBACK)),
            wraps: packScenario({
                name: 'Food cart — lunch rush',
                price1: 80, priceDrop1: 0.08, cost1: 35,
                price2: 40, priceDrop2: 0.03, cost2: 12,
                congestion: 0.02, fixedCost: 1500,
                currentX: 120, currentY: 90
            }, {
                product1: 'wraps', product2: 'juices',
                unit1: 'wraps per day', unit2: 'juices per day', currency: '₹'
            }),
            print: packScenario({
                name: 'Print stall — campus week',
                price1: 40, priceDrop1: 0.04, cost1: 15,
                price2: 12, priceDrop2: 0.015, cost2: 4,
                congestion: 0.008, fixedCost: 800,
                currentX: 180, currentY: 220
            }, {
                product1: 'posters', product2: 'flyers',
                unit1: 'posters per day', unit2: 'flyers per day', currency: '₹'
            })
        };

        function readCustomForm() {
            var f = document.getElementById('ws-q-form');
            if (!f) {
                return null;
            }
            var p1 = String(f.product1.value || '').trim();
            var p2 = String(f.product2.value || '').trim();
            if (!p1 || !p2) {
                return null;
            }
            return packScenario({
                name: String(f.name.value || '').trim() || 'Custom shop',
                price1: f.price1.value,
                priceDrop1: f.priceDrop1.value,
                cost1: f.cost1.value,
                price2: f.price2.value,
                priceDrop2: f.priceDrop2.value,
                cost2: f.cost2.value,
                congestion: f.congestion.value,
                fixedCost: f.fixedCost.value,
                currentX: f.currentX.value,
                currentY: f.currentY.value
            }, {
                product1: p1,
                product2: p2,
                unit1: p1 + ' per day',
                unit2: p2 + ' per day',
                currency: '₹'
            });
        }

        function fillCustomForm(data) {
            var f = document.getElementById('ws-q-form');
            if (!f || !data) {
                return;
            }
            f.name.value = data.name || '';
            var lab = data.labels || FALLBACK.labels;
            f.product1.value = lab.product1 || '';
            f.product2.value = lab.product2 || '';
            ['price1', 'priceDrop1', 'cost1', 'price2', 'priceDrop2', 'cost2', 'congestion', 'fixedCost', 'currentX', 'currentY'].forEach(function(k) {
                if (f.elements[k]) {
                    f.elements[k].value = data[k];
                }
            });
        }

        function renderMake() {
            var canvas = document.getElementById('ws-canvas-make');
            if (!canvas) {
                return;
            }
            var saved = model;
            var data = readCustomForm();
            if (data && !isNaN(data.price1) && !isNaN(data.currentX)) {
                model = data;
            }
            drawSurface(canvas, {
                contour: true,
                peak: true,
                here: {x: model.currentX, y: model.currentY},
                noTrail: true
            });
            var here = document.getElementById('ws-q-here');
            if (here) {
                var pk = peak(c());
                var msg = L().p1 + ' ' + roundUnits(model.currentX) + ' · ' + L().p2 + ' ' +
                    roundUnits(model.currentY) + ' · profit ' + rupees(profit(c(), model.currentX, model.currentY), 0);
                if (pk.ok) {
                    msg += ' · top at ' + roundUnits(pk.x) + ' / ' + roundUnits(pk.y);
                }
                here.textContent = msg;
            }
            var warn = document.getElementById('ws-make-warn');
            if (warn) {
                var pk2 = peak(c());
                warn.hidden = pk2.ok;
                warn.textContent = pk2.ok ? '' : 'These numbers do not have a single best mix — try a smaller congestion value.';
            }
            model = saved;
        }

        function playCustom() {
            var data = readCustomForm();
            var warn = document.getElementById('ws-make-warn');
            if (!data || isNaN(data.price1) || isNaN(data.currentX)) {
                if (warn) {
                    warn.hidden = false;
                    warn.textContent = 'Fill in both product names and every number.';
                }
                return;
            }
            var pk = peak(coeffs(data));
            if (!pk.ok) {
                if (warn) {
                    warn.hidden = false;
                    warn.textContent = 'These numbers do not have a best mix — try a smaller congestion value.';
                }
                return;
            }
            if (warn) {
                warn.hidden = true;
            }
            scenario = JSON.parse(JSON.stringify(data));
            model = JSON.parse(JSON.stringify(data));
            walked = false;
            bPass = false;
            pPass = false;
            mapped = {x: false, y: false, z: false};
            checkpoint = {found: false};
            if (isAdvanced()) {
                setStepEnabled('function', false);
                setStepEnabled('compare', false);
                setStepEnabled('tools', false);
            } else {
                setStepEnabled('c', false);
                setStepEnabled('d', false);
            }
            fillForm();
            applyModel(false);
            showScreen(isAdvanced() ? 'model' : 'a');
            celebrate('Your question is live — same graphs, new shop.');
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
            mark = {x: model.currentX, y: model.currentY};
            applyLabels();
            var markX = document.getElementById('ws-mark-x');
            var markY = document.getElementById('ws-mark-y');
            if (markX) {
                markX.value = String(roundUnits(mark.x));
            }
            if (markY) {
                markY.value = String(roundUnits(mark.y));
            }
            walked = false;
            bPass = false;
            pPass = false;
            if (isAdvanced()) {
                checkpoint = {found: false};
                mapped = {x: false, y: false, z: false};
                root.querySelectorAll('.cu-ws__map-row button').forEach(function(b) {
                    b.classList.remove('is-right', 'is-wrong');
                });
                var mapStatus = document.getElementById('ws-map-status');
                if (mapStatus) {
                    mapStatus.textContent = 'Match all three before you go on.';
                    mapStatus.classList.remove('is-ok');
                }
                var checkStatus = document.getElementById('ws-check-status');
                if (checkStatus) {
                    checkStatus.textContent = 'Move toward higher profit, then mark. Close is enough — no zoom needed.';
                    checkStatus.classList.remove('is-ok');
                }
                setStepEnabled('function', false);
                setStepEnabled('compare', false);
                setStepEnabled('tools', false);
                setStepEnabled('make', false);
                renderAll();
                fillPCheck();
            } else {
                setStepEnabled('c', false);
                setStepEnabled('d', false);
                setStepEnabled('make', false);
                resetChoice('ws-b-check');
                renderAll();
                unlock('b');
            }
            return true;
        }

        function loadSample() {
            model = JSON.parse(JSON.stringify(scenario));
            actuals = {x: scenario.currentX, y: scenario.currentY};
            fillForm();
            applyModel(false);
        }

        function showScreen(id) {
            if (!unlocked[id]) {
                return;
            }
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
                if (id === 'a' || id === 'model') {
                    renderA();
                    updateEquation();
                } else if (id === 'b') {
                    renderB();
                } else if (id === 'c') {
                    renderC();
                } else if (id === 'd') {
                    renderD();
                } else if (id === 'function') {
                    renderFn();
                } else if (id === 'compare') {
                    renderCompare();
                    updateBiz();
                } else if (id === 'tools') {
                    renderB();
                    renderC();
                    renderD();
                    updateReveal();
                } else if (id === 'make') {
                    fillCustomForm(model);
                    renderMake();
                }
                updateChip();
                updateHere();
                updateProgress();
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
                    L().p2.charAt(0).toUpperCase() + L().p2.slice(1) + ' held still · ' + L().p1 + ' can move';
                document.getElementById('ws-freeze-value').textContent = roundUnits(model.currentY) + ' ' + L().p2;
                document.getElementById('ws-free-value').textContent = roundUnits(model.currentX) + ' ' + L().p1;
                document.getElementById('ws-freeze-slider-name').textContent = L().p2.charAt(0).toUpperCase() + L().p2.slice(1) + ' — held still';
                document.getElementById('ws-free-slider-name').textContent = L().p1.charAt(0).toUpperCase() + L().p1.slice(1) + ' — can move';
                document.getElementById('ws-hint-b').textContent =
                    'Hold ' + L().p2 + ' still. Only ' + L().p1 + ' can move. Left is the hill sliced; right is that slice as a curve.';
            } else {
                freezeSlider.min = '0';
                freezeSlider.max = String(Math.round(range.xmax));
                freezeSlider.value = String(roundUnits(model.currentX));
                freeSlider.min = '0';
                freeSlider.max = String(Math.round(range.ymax));
                freeSlider.value = String(roundUnits(model.currentY));
                document.getElementById('ws-freeze-label').textContent =
                    L().p1.charAt(0).toUpperCase() + L().p1.slice(1) + ' held still · ' + L().p2 + ' can move';
                document.getElementById('ws-freeze-value').textContent = roundUnits(model.currentX) + ' ' + L().p1;
                document.getElementById('ws-free-value').textContent = roundUnits(model.currentY) + ' ' + L().p2;
                document.getElementById('ws-freeze-slider-name').textContent = L().p1.charAt(0).toUpperCase() + L().p1.slice(1) + ' — held still';
                document.getElementById('ws-free-slider-name').textContent = L().p2.charAt(0).toUpperCase() + L().p2.slice(1) + ' — can move';
                document.getElementById('ws-hint-b').textContent =
                    'Hold ' + L().p1 + ' still. Only ' + L().p2 + ' can move. Left is the hill sliced; right is that slice as a curve.';
            }
            updateBCheckQuestion();
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
                if (btn.disabled) {
                    return;
                }
                showScreen(btn.getAttribute('data-ws-screen'));
            });
        });

        var bBox = document.getElementById('ws-b-check');
        if (bBox) {
            bBox.querySelectorAll('button[data-ans]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var sl = freeSlope();
                    var need = sl > 0.005 ? 'up' : sl < -0.005 ? 'down' : 'flat';
                    bBox.querySelectorAll('button[data-ans]').forEach(function(b) {
                        b.classList.remove('is-right', 'is-wrong');
                    });
                    var ok = btn.getAttribute('data-ans') === need;
                    btn.classList.add(ok ? 'is-right' : 'is-wrong');
                    var status = document.getElementById('ws-b-check-status');
                    var extra = freeze === 'y' ? L().one1 : L().one2;
                    if (ok) {
                        bPass = true;
                        status.textContent = 'Yes. ' + slopeSentence(extra, sl);
                        status.classList.add('is-ok');
                        celebrate('Got it — one slope at a time.');
                        unlock('c');
                    } else {
                        status.textContent = 'Look at the tilted line and the rupee sentence under the pictures, then try again.';
                        status.classList.remove('is-ok');
                    }
                });
            });
        }

        root.querySelectorAll('.cu-ws__map-row').forEach(function(row) {
            var key = row.getAttribute('data-map');
            row.querySelectorAll('button').forEach(function(choice) {
                choice.addEventListener('click', function() {
                    var ok = choice.getAttribute('data-choice') === mapAnswers[key];
                    row.querySelectorAll('button').forEach(function(b) {
                        b.classList.remove('is-right', 'is-wrong');
                    });
                    choice.classList.add(ok ? 'is-right' : 'is-wrong');
                    mapped[key] = ok;
                    var done = mapped.x && mapped.y && mapped.z;
                    var status = document.getElementById('ws-map-status');
                    status.textContent = done
                        ? 'Yes — x is ' + L().p1 + ', y is ' + L().p2 + ', P is profit.'
                        : (ok ? 'That one is right. Match the others.' : 'Not that one — try again.');
                    status.classList.toggle('is-ok', done);
                    if (done) {
                        celebrate('Letters match the shop.');
                        unlock('compare');
                    }
                });
            });
        });

        function unmapXY(px, py, w, h, pad) {
            pad = pad || 28;
            return {
                x: range.xmin + (px - pad) / (w - pad * 2 || 1) * (range.xmax - range.xmin),
                y: range.ymin + (h - pad - py) / (h - pad * 2 || 1) * (range.ymax - range.ymin)
            };
        }

        function closeEnoughMark() {
            var pk = peak(c());
            if (!pk.ok) {
                return false;
            }
            var dist = Math.sqrt(Math.pow(mark.x - pk.x, 2) + Math.pow(mark.y - pk.y, 2));
            var gap = profit(c(), pk.x, pk.y) - profit(c(), mark.x, mark.y);
            return dist <= 40 || gap <= 50;
        }

        function markHintText() {
            var p = profit(c(), mark.x, mark.y);
            var sx = slopeX(c(), mark.x, mark.y);
            var sy = slopeY(c(), mark.x, mark.y);
            var bits = [];
            if (sx > 0.2) {
                bits.push('more ' + L().p1 + ' would raise profit');
            } else if (sx < -0.2) {
                bits.push('fewer ' + L().p1 + ' would raise profit');
            }
            if (sy > 0.2) {
                bits.push('more ' + L().p2 + ' would raise profit');
            } else if (sy < -0.2) {
                bits.push('fewer ' + L().p2 + ' would raise profit');
            }
            if (!bits.length) {
                return 'Profit here is ' + rupees(p, 0) + '. That is as high as it goes.';
            }
            return 'Profit here is ' + rupees(p, 0) + '. Still climbing — ' + bits.join('; ') + '.';
        }

        function setMark(x, y) {
            mark.x = Math.max(range.xmin, Math.min(range.xmax, x));
            mark.y = Math.max(range.ymin, Math.min(range.ymax, y));
            var mx = document.getElementById('ws-mark-x');
            var my = document.getElementById('ws-mark-y');
            if (mx) {
                mx.value = String(roundUnits(mark.x));
            }
            if (my) {
                my.value = String(roundUnits(mark.y));
            }
            var status = document.getElementById('ws-check-status');
            if (status && !checkpoint.found) {
                status.textContent = markHintText();
                status.classList.remove('is-ok');
            }
            renderCompare();
        }

        function acceptMark() {
            var pk = peak(c());
            var status = document.getElementById('ws-check-status');
            if (!pk.ok || !status) {
                return;
            }
            if (!closeEnoughMark()) {
                checkpoint.found = false;
                status.textContent = markHintText() + ' Mark again when it looks highest.';
                status.classList.remove('is-ok');
                renderCompare();
                return;
            }
            checkpoint.found = true;
            mark = {x: pk.x, y: pk.y};
            setMark(pk.x, pk.y);
            var sx = slopeX(c(), pk.x, pk.y);
            var sy = slopeY(c(), pk.x, pk.y);
            status.textContent = 'Close enough — the highest mix is ' + roundUnits(pk.x) +
                ' ' + L().p1 + ' · ' + roundUnits(pk.y) + ' ' + L().p2 + ', profit ' +
                rupees(profit(c(), pk.x, pk.y), 0) +
                '. At that point ∂P/∂x ≈ ' + sx.toFixed(2) +
                ' and ∂P/∂y ≈ ' + sy.toFixed(2) + ' (both quiet).';
            status.classList.add('is-ok');
            celebrate('That’s the top.');
            unlock('tools');
            unlock('make');
            try {
                window.sessionStorage.setItem('cu-ws-checkpoint-multivariable', JSON.stringify({
                    found: true,
                    x: roundUnits(pk.x),
                    y: roundUnits(pk.y),
                    profit: profit(c(), pk.x, pk.y),
                    at: Date.now()
                }));
            } catch (err) {
                // sessionStorage may be blocked.
            }
            renderCompare();
        }

        var compareCanvas = document.getElementById('ws-canvas-compare');
        if (compareCanvas) {
            compareCanvas.addEventListener('click', function(ev) {
                var rect = compareCanvas.getBoundingClientRect();
                var size = canvasSize(compareCanvas);
                var px = (ev.clientX - rect.left) * (size.w / rect.width);
                var py = (ev.clientY - rect.top) * (size.h / rect.height);
                var hit = unmapXY(px, py, size.w, size.h);
                setMark(hit.x, hit.y);
            });
        }

        var markXEl = document.getElementById('ws-mark-x');
        var markYEl = document.getElementById('ws-mark-y');
        if (markXEl) {
            markXEl.addEventListener('input', function() {
                setMark(Number(this.value), mark.y);
            });
        }
        if (markYEl) {
            markYEl.addEventListener('input', function() {
                setMark(mark.x, Number(this.value));
            });
        }
        var markBtn = document.getElementById('ws-mark-top');
        if (markBtn) {
            markBtn.addEventListener('click', acceptMark);
        }

        var presetBox = document.getElementById('ws-q-presets');
        if (presetBox) {
            presetBox.addEventListener('click', function(ev) {
                var btn = ev.target.closest('[data-preset]');
                if (!btn) {
                    return;
                }
                var key = btn.getAttribute('data-preset');
                if (PRESETS[key]) {
                    fillCustomForm(PRESETS[key]);
                    renderMake();
                }
            });
        }
        var qForm = document.getElementById('ws-q-form');
        if (qForm) {
            qForm.addEventListener('input', function() {
                renderMake();
            });
        }
        var playBtn = document.getElementById('ws-q-play');
        if (playBtn) {
            playBtn.addEventListener('click', playCustom);
        }

        var toggleFn = document.getElementById('ws-toggle-fn');
        if (toggleFn) {
            toggleFn.addEventListener('click', function() {
                showContourFn = !showContourFn;
                this.textContent = showContourFn ? 'Show the hill' : 'Show map from above';
                renderFn();
            });
        }

        document.getElementById('ws-sample').addEventListener('click', loadSample);
        var plotBtn = document.getElementById('ws-plot');
        if (plotBtn) {
            plotBtn.addEventListener('click', applyModel);
        }
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

        function noteWalk() {
            if (!walked) {
                walked = true;
                if (!isAdvanced()) {
                    unlock('d');
                    unlock('make');
                    celebrate('You walked the hill.');
                }
            }
        }

        document.getElementById('ws-slider-x').addEventListener('input', function() {
            model.currentX = Number(this.value);
            form.elements.currentX.value = model.currentX;
            pushTrail();
            updateChip();
            renderC();
            noteWalk();
        });
        document.getElementById('ws-slider-y').addEventListener('input', function() {
            model.currentY = Number(this.value);
            form.elements.currentY.value = model.currentY;
            pushTrail();
            updateChip();
            renderC();
            noteWalk();
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
            noteWalk();
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
            showScreen(isAdvanced() ? 'tools' : 'd');
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
                    btn.textContent = 'Copy';
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
        ['ws-canvas-a', 'ws-canvas-fn', 'ws-canvas-b3d'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) {
                return;
            }
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
                } else if (el.id === 'ws-canvas-fn') {
                    renderFn();
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
                    } else if (el.id === 'ws-canvas-fn') {
                        renderFn();
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
        showScreen(isAdvanced() ? 'model' : 'a');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
