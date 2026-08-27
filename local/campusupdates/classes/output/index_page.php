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

    /** @var string */
    private string $view;

    /** @var string */
    private string $chapter;

    /** @var string */
    private string $topic;

    /** @var string */
    private string $mode;

    /**
     * @param string $section Requested section key.
     * @param string $courseid Optional course id when section is course.
     * @param string $view Optional view (workshop).
     * @param string $chapter Optional chapter id.
     * @param string $topic Optional topic id.
     * @param string $mode simple or advanced.
     */
    public function __construct(
        string $section,
        string $courseid = '',
        string $view = '',
        string $chapter = '',
        string $topic = '',
        string $mode = ''
    ) {
        $this->section = placeholder::resolve_section($section);
        $this->courseid = $courseid;
        $this->view = $view;
        $this->chapter = $chapter;
        $this->topic = $topic;
        $this->mode = $mode === 'advanced' ? 'advanced' : 'simple';
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
        $data->sectionclass = 'is-' . $this->section
            . ($this->view === 'workshop' ? ' is-workshop' : '')
            . ($this->chapter !== '' && $this->view !== 'workshop' ? ' is-chapter' : '');
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
        $data->hasworkshop = false;
        $data->haschapter = false;
        $data->workshop = null;
        $data->chapter = null;
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
        if ($selected && $this->view === 'workshop') {
            $chapter = $this->chapter !== ''
                ? feed::chapter($selected, $this->chapter)
                : feed::first_ready_chapter($selected);
            $topic = $chapter ? feed::topic($chapter, $this->topic) : null;
            if ($chapter && $topic && !empty($chapter['ready'])) {
                $data->hasworkshop = true;
                $data->workshop = $this->export_workshop($selected, $chapter, $topic);
                return;
            }
            if ($chapter) {
                $data->haschapter = true;
                $data->chapter = $this->export_chapter($selected, $chapter);
                return;
            }
        }
        if ($selected && $this->chapter !== '') {
            $chapter = feed::chapter($selected, $this->chapter);
            if ($chapter) {
                $data->haschapter = true;
                $data->chapter = $this->export_chapter($selected, $chapter);
                return;
            }
        }
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
     * Chapter picker: topics plus simple / advanced.
     *
     * @param array $course
     * @param array $chapter
     * @return array
     */
    private function export_chapter(array $course, array $chapter): array {
        $courseid = $course['id'] ?? '';
        $topics = [];
        foreach ($chapter['topics'] ?? [] as $topic) {
            $base = [
                'section' => 'course',
                'course' => $courseid,
                'chapter' => $chapter['id'] ?? '',
                'topic' => $topic['id'] ?? '',
                'view' => 'workshop',
            ];
            $topics[] = [
                'id' => $topic['id'] ?? '',
                'title' => $topic['title'] ?? '',
                'syllabus' => $topic['syllabus'] ?? '',
                'hassyllabus' => ($topic['syllabus'] ?? '') !== '',
                'summary' => $topic['summary'] ?? '',
                'simpleurl' => (new moodle_url('/local/campusupdates/index.php', $base + ['mode' => 'simple']))->out(false),
                'advancedurl' => (new moodle_url('/local/campusupdates/index.php', $base + ['mode' => 'advanced']))->out(false),
                'modelabel' => get_string('choosemode', 'local_campusupdates'),
                'simplelabel' => get_string('modesimple', 'local_campusupdates'),
                'simplehelp' => get_string('modesimplehelp', 'local_campusupdates'),
                'advancedlabel' => get_string('modeadvanced', 'local_campusupdates'),
                'advancedhelp' => get_string('modeadvancedhelp', 'local_campusupdates'),
            ];
        }

        return [
            'id' => $chapter['id'] ?? '',
            'title' => $chapter['title'] ?? '',
            'subtitle' => $chapter['subtitle'] ?? '',
            'summary' => $chapter['summary'] ?? '',
            'ready' => !empty($chapter['ready']),
            'hastopics' => !empty($topics),
            'topics' => $topics,
            'comingsoon' => get_string('chaptercomingsoon', 'local_campusupdates'),
            'simplelabel' => get_string('modesimple', 'local_campusupdates'),
            'simplehelp' => get_string('modesimplehelp', 'local_campusupdates'),
            'advancedlabel' => get_string('modeadvanced', 'local_campusupdates'),
            'advancedhelp' => get_string('modeadvancedhelp', 'local_campusupdates'),
            'topiclabel' => get_string('choosetopic', 'local_campusupdates'),
            'modelabel' => get_string('choosemode', 'local_campusupdates'),
            'coursetitle' => $course['title'] ?? '',
            'backurl' => (new moodle_url('/local/campusupdates/index.php', [
                'section' => 'course',
                'course' => $courseid,
            ]))->out(false),
            'backlabel' => get_string('backtocourse', 'local_campusupdates'),
        ];
    }

    /**
     * Hands-on workshop for one chapter topic.
     *
     * @param array $course
     * @param array $chapter
     * @param array $topic
     * @return array
     */
    private function export_workshop(array $course, array $chapter, array $topic): array {
        $courseid = $course['id'] ?? '';
        $chapterid = $chapter['id'] ?? '';
        $topicid = $topic['id'] ?? '';
        $issimple = $this->mode !== 'advanced';
        $base = [
            'section' => 'course',
            'course' => $courseid,
            'chapter' => $chapterid,
            'topic' => $topicid,
            'view' => 'workshop',
        ];

        return [
            'title' => $chapter['title'] ?? '',
            'topictitle' => $topic['title'] ?? '',
            'chapterid' => $chapterid,
            'topicid' => $topicid,
            'kind' => $topic['kind'] ?? 'multivariable',
            'mode' => $this->mode,
            'issimple' => $issimple,
            'isadvanced' => !$issimple,
            'simpleurl' => (new moodle_url('/local/campusupdates/index.php', $base + ['mode' => 'simple']))->out(false),
            'advancedurl' => (new moodle_url('/local/campusupdates/index.php', $base + ['mode' => 'advanced']))->out(false),
            'simplelabel' => get_string('modesimple', 'local_campusupdates'),
            'advancedlabel' => get_string('modeadvanced', 'local_campusupdates'),
            'backurl' => (new moodle_url('/local/campusupdates/index.php', [
                'section' => 'course',
                'course' => $courseid,
                'chapter' => $chapterid,
            ]))->out(false),
            'backlabel' => get_string('backtochapter', 'local_campusupdates'),
            'samplejson' => json_encode(feed::workshop_sample(), JSON_UNESCAPED_UNICODE),
        ];
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

        $chapters = [];
        foreach (feed::chapters($course) as $chapter) {
            $ready = !empty($chapter['ready']);
            $chapters[] = [
                'id' => $chapter['id'] ?? '',
                'title' => $chapter['title'] ?? '',
                'subtitle' => $chapter['subtitle'] ?? '',
                'summary' => $chapter['summary'] ?? '',
                'ready' => $ready,
                'comingsoon' => !$ready,
                'openlabel' => $ready
                    ? get_string('openchapter', 'local_campusupdates')
                    : get_string('chaptercomingsoon', 'local_campusupdates'),
                'url' => $ready
                    ? (new moodle_url('/local/campusupdates/index.php', [
                        'section' => 'course',
                        'course' => $id,
                        'chapter' => $chapter['id'] ?? '',
                    ]))->out(false)
                    : '',
            ];
        }
        $firstready = feed::first_ready_chapter($course);

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
            'hasplayground' => false,
            'haschapters' => !empty($chapters),
            'chapters' => $chapters,
            'chapterslabel' => get_string('chaptersheading', 'local_campusupdates'),
            'hasworkshopmodule' => $id === 'business-math',
            'workshopurl' => $firstready
                ? (new moodle_url('/local/campusupdates/index.php', [
                    'section' => 'course',
                    'course' => $id,
                    'chapter' => $firstready['id'] ?? '',
                ]))->out(false)
                : (new moodle_url('/local/campusupdates/index.php', [
                    'section' => 'course',
                    'course' => $id,
                    'view' => 'workshop',
                ]))->out(false),
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
