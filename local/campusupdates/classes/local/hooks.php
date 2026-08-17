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

namespace local_campusupdates\local;

use context_system;
use core\hook\navigation\primary_extend;
use moodle_url;
use navigation_node;

/**
 * Hook callbacks for local_campusupdates.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hooks {

    /**
     * Add Campus Updates to the primary navigation.
     *
     * @param primary_extend $hook
     */
    public static function extend_primary_navigation(primary_extend $hook): void {
        if (during_initial_install() || !get_config('local_campusupdates', 'version')) {
            return;
        }

        if (!isloggedin() || isguestuser()) {
            return;
        }

        if (!has_capability('local/campusupdates:view', context_system::instance())) {
            return;
        }

        $hook->get_primaryview()->add(
            get_string('pluginname', 'local_campusupdates'),
            new moodle_url('/local/campusupdates/index.php'),
            navigation_node::TYPE_CUSTOM,
            null,
            'local_campusupdates'
        );
    }
}
