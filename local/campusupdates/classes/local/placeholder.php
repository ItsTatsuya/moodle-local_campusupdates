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

/**
 * Section helpers. Item bodies live in data/*.json via feed.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class placeholder {

    /**
     * Supported section keys.
     *
     * @return string[]
     */
    public static function section_keys(): array {
        return ['tech', 'course', 'industry'];
    }

    /**
     * Whether a section is enabled in plugin settings.
     *
     * @param string $section
     * @return bool
     */
    public static function section_enabled(string $section): bool {
        $name = 'show' . $section;
        $value = get_config('local_campusupdates', $name);
        return $value === false || (int) $value === 1;
    }

    /**
     * First enabled section, used as the default tab.
     *
     * @return string
     */
    public static function default_section(): string {
        foreach (self::section_keys() as $key) {
            if (self::section_enabled($key)) {
                return $key;
            }
        }
        return 'tech';
    }

    /**
     * Resolve a requested section to an enabled one.
     *
     * @param string $section
     * @return string
     */
    public static function resolve_section(string $section): string {
        if (in_array($section, self::section_keys(), true) && self::section_enabled($section)) {
            return $section;
        }
        return self::default_section();
    }

    /**
     * Items for one section (JSON-backed).
     *
     * @param string $section
     * @return array
     */
    public static function items_for(string $section): array {
        return feed::items($section);
    }
}
