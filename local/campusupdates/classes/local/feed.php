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
 * Load demo feeds from JSON so a later API can replace the files.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class feed {

    /**
     * Absolute path to a data file.
     *
     * @param string $name File name without .json
     * @return string
     */
    public static function path(string $name): string {
        return dirname(__DIR__, 2) . '/data/' . $name . '.json';
    }

    /**
     * Decode a JSON file from data/.
     *
     * @param string $name
     * @return array
     */
    public static function decode(string $name): array {
        $path = self::path($name);
        if (!is_readable($path)) {
            return [];
        }
        $raw = file_get_contents($path);
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * News / listing items for tech or industry.
     *
     * @param string $section
     * @return array
     */
    public static function items(string $section): array {
        if ($section === 'course') {
            return self::courses();
        }
        $data = self::decode($section);
        return $data['items'] ?? [];
    }

    /**
     * Demo courses.
     *
     * @return array
     */
    public static function courses(): array {
        $data = self::decode('courses');
        return $data['courses'] ?? [];
    }

    /**
     * One course by id.
     *
     * @param string $id
     * @return array|null
     */
    public static function course(string $id): ?array {
        foreach (self::courses() as $course) {
            if (($course['id'] ?? '') === $id) {
                return $course;
            }
        }
        return null;
    }
}
