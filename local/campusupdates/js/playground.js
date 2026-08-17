(function() {
    'use strict';

    function boot() {
        var board = document.getElementById('cu-play-board');
        var nodesRoot = document.getElementById('cu-play-nodes');
        var wires = document.getElementById('cu-play-wires');
        var tray = document.getElementById('cu-play-tray');
        var hint = document.getElementById('cu-play-hint');
        if (!board || !nodesRoot || !wires || !tray) {
            return;
        }

        var nodes = [];
        var links = [];
        var nextId = 1;
        var drag = null;
        var linkDrag = null;

        var sample = [
            {kind: 'start', label: 'New product', x: 200, y: 18},
            {kind: 'process', label: 'List fixed costs', x: 186, y: 96},
            {kind: 'formula', label: 'Variable cost / unit', x: 176, y: 174},
            {kind: 'formula', label: 'BE = FC / (P − VC)', x: 174, y: 252},
            {kind: 'decision', label: 'Units > break-even?', x: 174, y: 340},
            {kind: 'end', label: 'Profit', x: 64, y: 440},
            {kind: 'end', label: 'Rethink price', x: 318, y: 440}
        ];

        function uid() {
            return 'n' + (nextId++);
        }

        function findNode(id) {
            return nodes.find(function(n) {
                return n.id === id;
            });
        }

        function el(node) {
            return nodesRoot.querySelector('[data-id="' + node.id + '"]');
        }

        function boardSize() {
            return {w: board.clientWidth, h: board.clientHeight};
        }

        function clampNode(node, box) {
            var size = boardSize();
            var w = box ? box.offsetWidth : 140;
            var h = box ? box.offsetHeight : 40;
            node.x = Math.min(Math.max(8, node.x), Math.max(8, size.w - w - 8));
            node.y = Math.min(Math.max(8, node.y), Math.max(8, size.h - h - 8));
        }

        function addNode(kind, label, x, y) {
            var node = {id: uid(), kind: kind, label: label, x: x, y: y};
            nodes.push(node);
            render();
            return node;
        }

        function removeNode(id) {
            nodes = nodes.filter(function(n) {
                return n.id !== id;
            });
            links = links.filter(function(l) {
                return l.from !== id && l.to !== id;
            });
            render();
        }

        function alreadyLinked(from, to) {
            return links.some(function(l) {
                return l.from === from && l.to === to;
            });
        }

        function render() {
            nodesRoot.innerHTML = '';
            nodes.forEach(function(node) {
                var div = document.createElement('div');
                div.className = 'cu-node';
                div.dataset.id = node.id;
                div.dataset.kind = node.kind;
                div.style.left = node.x + 'px';
                div.style.top = node.y + 'px';
                div.innerHTML =
                    '<button type="button" class="cu-node__del" aria-label="Remove block">×</button>' +
                    '<span class="cu-node__label"></span>' +
                    '<span class="cu-node__port" title="Drag to another block to connect"></span>';
                div.querySelector('.cu-node__label').textContent = node.label;
                nodesRoot.appendChild(div);
                clampNode(node, div);
                div.style.left = node.x + 'px';
                div.style.top = node.y + 'px';
            });
            drawWires();
            updateHint();
        }

        function portPoint(node) {
            var box = el(node);
            if (!box) {
                return {x: node.x + 70, y: node.y + 40};
            }
            return {
                x: node.x + box.offsetWidth / 2,
                y: node.y + box.offsetHeight - 2
            };
        }

        function topPoint(node) {
            var box = el(node);
            if (!box) {
                return {x: node.x + 70, y: node.y};
            }
            return {
                x: node.x + box.offsetWidth / 2,
                y: node.y + 2
            };
        }

        function drawWires(preview) {
            var parts = [
                '<defs><marker id="cu-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
                '<path d="M 0 0 L 10 5 L 0 10 z" fill="#0f766e" /></marker></defs>'
            ];
            links.forEach(function(link) {
                var a = findNode(link.from);
                var b = findNode(link.to);
                if (!a || !b) {
                    return;
                }
                var p = portPoint(a);
                var q = topPoint(b);
                var my = (p.y + q.y) / 2;
                parts.push(
                    '<path d="M ' + p.x + ' ' + p.y + ' C ' + p.x + ' ' + my + ', ' + q.x + ' ' + my + ', ' + q.x + ' ' + q.y +
                    '" fill="none" stroke="#0f766e" stroke-width="2" marker-end="url(#cu-arrow)" />'
                );
            });
            if (preview) {
                parts.push(
                    '<path d="M ' + preview.x1 + ' ' + preview.y1 + ' L ' + preview.x2 + ' ' + preview.y2 +
                    '" fill="none" stroke="#0f766e" stroke-width="2" stroke-dasharray="5 4" />'
                );
            }
            wires.innerHTML = parts.join('');
        }

        function updateHint() {
            if (!hint) {
                return;
            }
            hint.textContent = nodes.length + ' blocks · ' + links.length +
                ' links · Drag a block to move · Drag the green dot to connect · × removes a block';
        }

        function loadSample() {
            nodes = [];
            links = [];
            nextId = 1;
            sample.forEach(function(item) {
                nodes.push({
                    id: uid(),
                    kind: item.kind,
                    label: item.label,
                    x: item.x,
                    y: item.y
                });
            });
            links = [
                {from: nodes[0].id, to: nodes[1].id},
                {from: nodes[1].id, to: nodes[2].id},
                {from: nodes[2].id, to: nodes[3].id},
                {from: nodes[3].id, to: nodes[4].id},
                {from: nodes[4].id, to: nodes[5].id},
                {from: nodes[4].id, to: nodes[6].id}
            ];
            render();
        }

        function boardPoint(event) {
            var rect = board.getBoundingClientRect();
            return {
                x: event.clientX - rect.left + board.scrollLeft,
                y: event.clientY - rect.top + board.scrollTop
            };
        }

        function nodeAtPoint(event) {
            var hit = document.elementFromPoint(event.clientX, event.clientY);
            var box = hit ? hit.closest('.cu-node') : null;
            return box ? box.dataset.id : null;
        }

        function emptySlot() {
            return {
                x: 24 + (nodes.length % 3) * 20,
                y: 24 + Math.min(nodes.length, 8) * 16
            };
        }

        tray.addEventListener('dragstart', function(event) {
            var chip = event.target.closest('[data-kind]');
            if (!chip) {
                return;
            }
            event.dataTransfer.setData('text/plain', chip.getAttribute('data-kind') + '|' + chip.textContent.trim());
            event.dataTransfer.effectAllowed = 'copy';
        });

        tray.addEventListener('click', function(event) {
            var chip = event.target.closest('[data-kind]');
            if (!chip || event.target.closest('.cu-play__tray-actions')) {
                return;
            }
            var slot = emptySlot();
            addNode(chip.getAttribute('data-kind'), chip.textContent.trim(), slot.x, slot.y);
        });

        board.addEventListener('dragover', function(event) {
            event.preventDefault();
        });

        board.addEventListener('drop', function(event) {
            event.preventDefault();
            var raw = event.dataTransfer.getData('text/plain');
            if (!raw || raw.indexOf('|') === -1) {
                return;
            }
            var bits = raw.split('|');
            var point = boardPoint(event);
            addNode(bits[0], bits[1], Math.max(8, point.x - 50), Math.max(8, point.y - 16));
        });

        nodesRoot.addEventListener('pointerdown', function(event) {
            var box = event.target.closest('.cu-node');
            if (!box) {
                return;
            }
            if (event.target.closest('.cu-node__del')) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            var node = findNode(box.dataset.id);
            if (!node) {
                return;
            }
            var point = boardPoint(event);
            if (event.target.closest('.cu-node__port')) {
                event.preventDefault();
                event.stopPropagation();
                linkDrag = {from: node.id};
                board.classList.add('is-linking');
                box.setPointerCapture(event.pointerId);
                return;
            }
            drag = {
                id: node.id,
                dx: point.x - node.x,
                dy: point.y - node.y
            };
            box.setPointerCapture(event.pointerId);
        });

        nodesRoot.addEventListener('pointermove', function(event) {
            var point = boardPoint(event);
            if (linkDrag) {
                var from = findNode(linkDrag.from);
                if (from) {
                    var start = portPoint(from);
                    drawWires({x1: start.x, y1: start.y, x2: point.x, y2: point.y});
                }
                return;
            }
            if (!drag) {
                return;
            }
            var node = findNode(drag.id);
            if (!node) {
                return;
            }
            node.x = point.x - drag.dx;
            node.y = point.y - drag.dy;
            var box = el(node);
            clampNode(node, box);
            box.style.left = node.x + 'px';
            box.style.top = node.y + 'px';
            drawWires();
        });

        nodesRoot.addEventListener('pointerup', function(event) {
            if (linkDrag) {
                var target = nodeAtPoint(event);
                if (target && target !== linkDrag.from && !alreadyLinked(linkDrag.from, target)) {
                    links.push({from: linkDrag.from, to: target});
                }
                linkDrag = null;
                board.classList.remove('is-linking');
                drawWires();
                updateHint();
            }
            drag = null;
        });

        nodesRoot.addEventListener('click', function(event) {
            var del = event.target.closest('.cu-node__del');
            if (!del) {
                return;
            }
            event.preventDefault();
            removeNode(del.closest('.cu-node').dataset.id);
        });

        nodesRoot.addEventListener('dblclick', function(event) {
            var label = event.target.closest('.cu-node__label');
            if (!label) {
                return;
            }
            var box = event.target.closest('.cu-node');
            var node = findNode(box.dataset.id);
            var next = window.prompt('Block label', node.label);
            if (next !== null && next.trim() !== '') {
                node.label = next.trim();
                render();
            }
        });

        document.getElementById('cu-play-sample').addEventListener('click', loadSample);
        document.getElementById('cu-play-clear').addEventListener('click', function() {
            nodes = [];
            links = [];
            render();
        });

        window.addEventListener('resize', function() {
            render();
        });

        loadSample();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
