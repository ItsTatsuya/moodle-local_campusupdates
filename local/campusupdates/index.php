<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle. If not, see <https://www.gnu.org/licenses/>.

/**
 * Campus Updates landing page.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

require_login();

$context = context_system::instance();
require_capability('local/campusupdates:view', $context);

$section = optional_param('section', '', PARAM_ALPHA);
$courseid = optional_param('course', '', PARAM_ALPHANUMEXT);
$view = optional_param('view', '', PARAM_ALPHA);
$chapter = optional_param('chapter', '', PARAM_ALPHANUMEXT);
$topic = optional_param('topic', '', PARAM_ALPHANUMEXT);
$mode = optional_param('mode', '', PARAM_ALPHA);

$urlparams = [];
if ($section !== '') {
    $urlparams['section'] = $section;
}
if ($courseid !== '') {
    $urlparams['course'] = $courseid;
}
if ($chapter !== '') {
    $urlparams['chapter'] = $chapter;
}
if ($topic !== '') {
    $urlparams['topic'] = $topic;
}
if ($view !== '') {
    $urlparams['view'] = $view;
}
if ($mode !== '') {
    $urlparams['mode'] = $mode;
}

$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/campusupdates/index.php', $urlparams));
$PAGE->set_pagelayout('standard');
$PAGE->set_title(get_string('pagetitle', 'local_campusupdates'));
$PAGE->set_heading(get_string('pageheading', 'local_campusupdates'));
$PAGE->set_primary_active_tab('local_campusupdates');
$PAGE->add_body_class('local-campusupdates-page');
$PAGE->requires->js(new moodle_url('/local/campusupdates/js/ui.js'));
if ($view === 'workshop') {
    $PAGE->add_body_class('local-campusupdates-workshop');
    $PAGE->requires->js(new moodle_url('/local/campusupdates/js/workshop.js', ['rev' => '2026082106']));
}

$page = new \local_campusupdates\output\index_page($section, $courseid, $view, $chapter, $topic, $mode);

echo $OUTPUT->header();
echo $OUTPUT->render($page);
echo $OUTPUT->footer();
