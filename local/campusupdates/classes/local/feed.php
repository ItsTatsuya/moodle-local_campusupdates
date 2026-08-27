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

    /**
     * Bakery sample used by the workshop. Never store computed values.
     *
     * @return array
     */
    public static function workshop_sample(): array {
        return self::decode('workshop-sample');
    }

    /**
     * Chapters belonging to a course.
     *
     * @param array $course
     * @return array
     */
    public static function chapters(array $course): array {
        return $course['chapters'] ?? [];
    }

    /**
     * One chapter by id.
     *
     * @param array $course
     * @param string $chapterid
     * @return array|null
     */
    public static function chapter(array $course, string $chapterid): ?array {
        foreach (self::chapters($course) as $chapter) {
            if (($chapter['id'] ?? '') === $chapterid) {
                return $chapter;
            }
        }
        return null;
    }

    /**
     * First chapter that already has a workshop.
     *
     * @param array $course
     * @return array|null
     */
    public static function first_ready_chapter(array $course): ?array {
        foreach (self::chapters($course) as $chapter) {
            if (!empty($chapter['ready'])) {
                return $chapter;
            }
        }
        return null;
    }

    /**
     * One topic inside a chapter.
     *
     * @param array $chapter
     * @param string $topicid
     * @return array|null
     */
    public static function topic(array $chapter, string $topicid): ?array {
        foreach ($chapter['topics'] ?? [] as $topic) {
            if (($topic['id'] ?? '') === $topicid) {
                return $topic;
            }
        }
        $topics = $chapter['topics'] ?? [];
        return $topics[0] ?? null;
    }
}
