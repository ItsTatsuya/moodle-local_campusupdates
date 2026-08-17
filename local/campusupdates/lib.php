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
 * Legacy callbacks for local_campusupdates.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Add Campus Updates to the global navigation tree (Boost drawer / fallback).
 *
 * @param global_navigation $navigation
 */
function local_campusupdates_extend_navigation(global_navigation $navigation): void {
    global $PAGE;

    if (!isloggedin() || isguestuser()) {
        return;
    }

    $context = context_system::instance();
    if (!has_capability('local/campusupdates:view', $context)) {
        return;
    }

    $url = new moodle_url('/local/campusupdates/index.php');
    $node = $navigation->add(
        get_string('pluginname', 'local_campusupdates'),
        $url,
        navigation_node::TYPE_CUSTOM,
        null,
        'local_campusupdates',
        new pix_icon('i/news', '')
    );
    $node->showinflatnavigation = true;

    if ($PAGE->url && $PAGE->url->compare($url, URL_MATCH_BASE)) {
        $node->make_active();
    }
}
