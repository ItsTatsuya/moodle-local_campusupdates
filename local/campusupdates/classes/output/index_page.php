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

namespace local_campusupdates\output;

use local_campusupdates\local\feed;
use local_campusupdates\local\placeholder;
use moodle_url;
use renderable;
use renderer_base;
use stdClass;
use core\output\named_templatable;

/**
 * Landing page for Campus Updates.
 *
 * @package   local_campusupdates
 * @copyright 2026 Campus Updates contributors
 * @license   https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class index_page implements renderable, named_templatable {

    /** @var string */
    private string $section;

    /** @var string */
    private string $courseid;

    /**
     * @param string $section Requested section key.
     * @param string $courseid Optional course id when section is course.
     */
    public function __construct(string $section, string $courseid = '') {
        $this->section = placeholder::resolve_section($section);
        $this->courseid = $courseid;
    }

    /**
     * Template name.
     *
     * @param renderer_base $renderer
     * @return string
     */
    public function get_template_name(renderer_base $renderer): string {
        return 'local_campusupdates/index_page';
    }

    /**
     * Export data for the mustache template.
     *
     * @param renderer_base $output
     * @return stdClass
     */
    public function export_for_template(renderer_base $output): stdClass {
        $tabs = [];
        foreach (placeholder::section_keys() as $key) {
            if (!placeholder::section_enabled($key)) {
                continue;
            }
            $items = placeholder::items_for($key);
            $tabs[] = [
                'key' => $key,
                'label' => get_string('section' . $key, 'local_campusupdates'),
                'help' => get_string('section' . $key . '_help', 'local_campusupdates'),
                'count' => count($items),
                'url' => (new moodle_url('/local/campusupdates/index.php', ['section' => $key]))->out(false),
                'active' => $key === $this->section,
            ];
        }

        $data = new stdClass();
        $data->subtitle = get_string('pagesubtitle', 'local_campusupdates');
        $data->demobadge = get_string('demobadge', 'local_campusupdates');
        $data->placeholdernote = get_string('placeholdernote', 'local_campusupdates');
        $data->sectionclass = 'is-' . $this->section;
        $data->tabs = $tabs;
        $data->istech = $this->section === 'tech';
        $data->iscourse = $this->section === 'course';
        $data->isindustry = $this->section === 'industry';
        $data->noitems = get_string('noitems', 'local_campusupdates');
        $data->latestlabel = get_string('latest', 'local_campusupdates');
        $data->readmore = get_string('readmore', 'local_campusupdates');
        $data->showless = get_string('showless', 'local_campusupdates');
        $data->hasfeatured = false;
        $data->featured = [];
        $data->hascards = false;
        $data->cards = [];
        $data->hasitems = false;
        $data->hascourselist = false;
        $data->courselist = [];
        $data->hascoursedetail = false;
        $data->course = null;
        $data->enquiry = $this->export_enquiry();
        $data->enquiryjson = json_encode($data->enquiry);

        if ($this->section === 'course') {
            $this->export_course_view($data);
            return $data;
        }

        $rawitems = placeholder::items_for($this->section);
        $featured = [];
        $cards = [];
        foreach ($rawitems as $item) {
            $exported = $this->export_item($item);
            if (!empty($item['featured']) && empty($featured)) {
                $featured[] = $exported;
            } else {
                $cards[] = $exported;
            }
        }

        $data->hasfeatured = !empty($featured);
        $data->featured = $featured;
        $data->hascards = !empty($cards);
        $data->cards = $cards;
        $data->hasitems = $data->hasfeatured || $data->hascards;

        return $data;
    }

    /**
     * Course list or a single course page.
     *
     * @param stdClass $data
     */
    private function export_course_view(stdClass $data): void {
        $selected = $this->courseid !== '' ? feed::course($this->courseid) : null;
        if ($selected) {
            $data->hascoursedetail = true;
            $data->course = $this->export_course($selected);
            return;
        }

        $list = [];
        foreach (feed::courses() as $course) {
            $list[] = $this->export_course_card($course);
        }
        $data->hascourselist = !empty($list);
        $data->courselist = $list;
    }

    /**
     * Compact card for the course catalogue.
     *
     * @param array $course
     * @return array
     */
    private function export_course_card(array $course): array {
        $id = $course['id'] ?? '';
        return [
            'id' => $id,
            'title' => $course['title'] ?? '',
            'tag' => $course['tag'] ?? '',
            'level' => $course['level'] ?? '',
            'duration' => $course['duration'] ?? '',
            'summary' => $course['summary'] ?? '',
            'thumb' => 'https://img.youtube.com/vi/' . ($course['youtubeid'] ?? '') . '/hqdefault.jpg',
            'url' => (new moodle_url('/local/campusupdates/index.php', [
                'section' => 'course',
                'course' => $id,
            ]))->out(false),
            'openlabel' => get_string('opencourse', 'local_campusupdates'),
        ];
    }

    /**
     * Full course page.
     *
     * @param array $course
     * @return array
     */
    private function export_course(array $course): array {
        $id = $course['id'] ?? '';
        $steps = [];
        foreach ($course['steps'] ?? [] as $step) {
            $steps[] = [
                'number' => $step['number'] ?? '',
                'title' => $step['title'] ?? '',
                'body' => $step['body'] ?? '',
            ];
        }
        $workshop = $course['workshop'] ?? [];
        $workshopparagraphs = [];
        foreach (preg_split("/\n\n+/", (string) ($workshop['body'] ?? '')) as $para) {
            $para = trim($para);
            if ($para !== '') {
                $workshopparagraphs[] = ['text' => $para];
            }
        }
        $paragraphs = [];
        foreach (preg_split("/\n\n+/", (string) ($course['description'] ?? '')) as $para) {
            $para = trim($para);
            if ($para !== '') {
                $paragraphs[] = ['text' => $para];
            }
        }

        return [
            'id' => $id,
            'title' => $course['title'] ?? '',
            'tag' => $course['tag'] ?? '',
            'level' => $course['level'] ?? '',
            'duration' => $course['duration'] ?? '',
            'summary' => $course['summary'] ?? '',
            'paragraphs' => $paragraphs,
            'youtubeid' => $course['youtubeid'] ?? '',
            'youtubetitle' => $course['youtubetitle'] ?? '',
            'hassteps' => !empty($steps),
            'steps' => $steps,
            'hasplayground' => ($course['mode'] ?? '') === 'playground',
            'backurl' => (new moodle_url('/local/campusupdates/index.php', ['section' => 'course']))->out(false),
            'backlabel' => get_string('backtocourses', 'local_campusupdates'),
            'enquirylabel' => get_string('relatedenquiry', 'local_campusupdates'),
            'workshoplabel' => get_string('workshop', 'local_campusupdates'),
            'workshoptitle' => $workshop['title'] ?? get_string('workshop', 'local_campusupdates'),
            'workshopparagraphs' => $workshopparagraphs,
            'stepslabel' => get_string('stepspath', 'local_campusupdates'),
            'playgroundlabel' => get_string('playground', 'local_campusupdates'),
            'playgroundhelp' => get_string('playgroundhelp', 'local_campusupdates'),
        ];
    }

    /**
     * Shared enquiry modal copy.
     *
     * @return array
     */
    private function export_enquiry(): array {
        return [
            'title' => get_string('enquirytitle', 'local_campusupdates'),
            'name' => get_string('enquiryname', 'local_campusupdates'),
            'email' => get_string('enquiryemail', 'local_campusupdates'),
            'message' => get_string('enquirymessage', 'local_campusupdates'),
            'submit' => get_string('enquirysubmit', 'local_campusupdates'),
            'close' => get_string('close', 'local_campusupdates'),
            'thanks' => get_string('enquirythanks', 'local_campusupdates'),
            'workshopsubmit' => get_string('workshopsubmit', 'local_campusupdates'),
            'workshopthanks' => get_string('workshopthanks', 'local_campusupdates'),
        ];
    }

    /**
     * Shape one feed item for the template.
     *
     * @param array $item
     * @return array
     */
    private function export_item(array $item): array {
        $published = $item['published'] ?? '';
        $timestamp = is_numeric($published) ? (int) $published : strtotime((string) $published);
        $body = trim((string) ($item['body'] ?? ''));
        $paragraphs = [];
        if ($body !== '') {
            foreach (preg_split("/\n\n+/", $body) as $para) {
                $para = trim($para);
                if ($para !== '') {
                    $paragraphs[] = ['text' => $para];
                }
            }
        }
        $url = trim((string) ($item['url'] ?? ''));

        return [
            'title' => $item['title'] ?? '',
            'summary' => $item['summary'] ?? '',
            'hasbody' => !empty($paragraphs),
            'paragraphs' => $paragraphs,
            'tag' => $item['tag'] ?? '',
            'source' => $item['source'] ?? '',
            'hasurl' => $url !== '',
            'url' => $url,
            'sourcelabel' => get_string('viewsource', 'local_campusupdates'),
            'displaydate' => $timestamp ? userdate($timestamp, get_string('strftimedaydate', 'langconfig')) : '',
            'featured' => !empty($item['featured']),
            'featuredlabel' => get_string('featured', 'local_campusupdates'),
            'readmore' => get_string('readmore', 'local_campusupdates'),
            'showless' => get_string('showless', 'local_campusupdates'),
        ];
    }
}
