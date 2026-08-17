(function() {
    'use strict';

    function boot() {
    var modal = document.getElementById('cu-modal');
    if (!modal) {
        return;
    }

    var copy = {};
    var copyNode = document.getElementById('cu-modal-copy');
    if (copyNode) {
        try {
            copy = JSON.parse(copyNode.textContent || '{}');
        } catch (e) {
            copy = {};
        }
    }

    var title = document.getElementById('cu-modal-title');
    var lead = document.getElementById('cu-modal-lead');
    var form = document.getElementById('cu-modal-form');
    var thanks = document.getElementById('cu-modal-thanks');
    var submit = document.getElementById('cu-modal-submit');
    var kindInput = document.getElementById('cu-modal-kind');
    var courseInput = document.getElementById('cu-modal-course');

    function openModal(kind, courseName, workshopId) {
        kindInput.value = kind;
        courseInput.value = courseName || '';
        form.hidden = false;
        thanks.hidden = true;
        form.reset();
        courseInput.value = courseName || '';
        kindInput.value = kind;

        if (kind === 'workshop') {
            title.textContent = copy.title ? '' : 'Workshop';
            var source = workshopId ? document.getElementById(workshopId) : null;
            var workshopTitle = source ? source.querySelector('[data-title]') : null;
            title.textContent = workshopTitle ? workshopTitle.textContent : (copy.title || 'Workshop');
            if (source) {
                var bits = [];
                source.querySelectorAll('p:not([data-title])').forEach(function(p) {
                    bits.push(p.textContent);
                });
                lead.textContent = bits.join(' ');
            } else {
                lead.textContent = '';
            }
            submit.textContent = copy.workshopsubmit || 'Register interest';
            thanks.textContent = copy.workshopthanks || '';
        } else {
            title.textContent = copy.title || 'Related enquiry';
            lead.textContent = courseName ? courseName : '';
            submit.textContent = copy.submit || 'Send enquiry';
            thanks.textContent = copy.thanks || '';
        }

        modal.hidden = false;
        var first = form.querySelector('input[name="name"]');
        if (first) {
            first.focus();
        }
    }

    function closeModal() {
        modal.hidden = true;
    }

    document.addEventListener('click', function(event) {
        var openBtn = event.target.closest('[data-cu-open]');
        if (openBtn) {
            event.preventDefault();
            openModal(
                openBtn.getAttribute('data-cu-open'),
                openBtn.getAttribute('data-cu-course'),
                openBtn.getAttribute('data-cu-workshop')
            );
            return;
        }
        if (event.target.closest('[data-cu-close]') || event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && !modal.hidden) {
            closeModal();
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        form.hidden = true;
        thanks.hidden = false;
    });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
