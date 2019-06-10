# coding=utf8

# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/

from __future__ import absolute_import
# import fluent.syntax.ast as FTL
from fluent.migrate.helpers import transforms_from
# from fluent.migrate.helpers import MESSAGE_REFERENCE, TERM_REFERENCE
# from fluent.migrate import COPY, CONCAT, REPLACE

TARGET_FILE = 'browser/browser/newtab/newtab.ftl'
SOURCE_FILE = TARGET_FILE

"""
For now while we're testing, use a recipe with slightly different paths for
testing from activity-stream instead of the usual steps:
https://firefox-source-docs.mozilla.org/intl/l10n/l10n/fluent_migrations.html#how-to-test-migration-recipes


One-time setup starting from activity-stream directory:

```
cd ..
git clone hg::https://hg.mozilla.org/l10n/fluent-migration
cd fluent-migration
pip install -e .

cd ..
hg clone https://hg.mozilla.org/l10n/gecko-strings
```
NB: gecko-strings needs to be cloned with mercurial not git-cinnabar

Testing from activity-stream directory:

```
rm -f ../gecko-strings/browser/browser/newtab/newtab.ftl
PYTHONPATH=./bin migrate-l10n bug_xxx_newtab --lang en-US --reference-dir . \
  --localization-dir ../gecko-strings
diff -B locales-src/newtab.ftl ../gecko-strings/browser/browser/newtab/newtab.ftl
```
NB: migrate-l10n will make local commits to gecko-strings

The diff should result in no differences if the migration recipe matches the
fluent file.
"""
SOURCE_FILE = 'locales-src/newtab.ftl'


def migrate(ctx):
    """WIP - Migrate newtab.properties to newtab.ftl, part {index}"""

    ctx.add_transforms(
        TARGET_FILE,
        SOURCE_FILE,
        transforms_from("""

newtab-page-title = { COPY(from_path, "newtab_page_title") }
newtab-settings-button =
    .title = { COPY(from_path, "settings_pane_button_label") }

newtab-search-box-search-button =
    .title = { COPY(from_path, "search_button") }
    .aria-label = { COPY(from_path, "search_button") }

newtab-search-box-search-the-web-text = { COPY(from_path, "search_web_placeholder") }
newtab-search-box-search-the-web-input =
    .placeholder = { COPY(from_path, "search_web_placeholder") }
    .title = { COPY(from_path, "search_web_placeholder") }
    .aria-label = { COPY(from_path, "search_web_placeholder") }

newtab-topsites-add-header = { COPY(from_path, "topsites_form_add_header") }
newtab-topsites-edit-header = { COPY(from_path, "topsites_form_edit_header") }
newtab-topsites-title-label = { COPY(from_path, "topsites_form_title_label") }
newtab-topsites-title-input =
    .placeholder = { COPY(from_path, "topsites_form_title_placeholder") }

newtab-topsites-url-label = { COPY(from_path, "topsites_form_url_label") }
newtab-topsites-url-input =
    .placeholder = { COPY(from_path, "topsites_form_url_placeholder") }
newtab-topsites-url-validation = { COPY(from_path, "topsites_form_url_validation") }

newtab-topsites-image-url-label = { COPY(from_path, "topsites_form_image_url_label") }
newtab-topsites-use-image-link = { COPY(from_path, "topsites_form_use_image_link") }
newtab-topsites-image-validation = { COPY(from_path, "topsites_form_image_validation") }

newtab-topsites-cancel-button = { COPY(from_path, "topsites_form_cancel_button") }
newtab-topsites-delete-history-button = { COPY(from_path, "menu_action_delete") }
newtab-topsites-save-button = { COPY(from_path, "topsites_form_save_button") }
newtab-topsites-preview-button = { COPY(from_path, "topsites_form_preview_button") }
newtab-topsites-add-button = { COPY(from_path, "topsites_form_add_button") }

newtab-confirm-delete-history-p1 = { COPY(from_path, "confirm_history_delete_p1") }
newtab-confirm-delete-history-p2 = { COPY(from_path, "confirm_history_delete_notice_p2") }

newtab-topsites-add-search-engine = { COPY(from_path, "section_menu_action_add_search_engine") }
newtab-topsites-tooltip =
    .title = { COPY(from_path, "context_menu_title") }
newtab-topsites-placeholder-tooltip =
    .title = { COPY(from_path, "edit_topsites_edit_button") }

newtab-menu-edit-topsites = { COPY(from_path, "edit_topsites_button_text") }
newtab-menu-open-new-window = { COPY(from_path, "menu_action_open_new_window") }
newtab-menu-open-new-private-window = { COPY(from_path, "menu_action_open_private_window") }
newtab-menu-dismiss = { COPY(from_path, "menu_action_dismiss") }
newtab-menu-pin = { COPY(from_path, "menu_action_pin") }
newtab-menu-unpin = { COPY(from_path, "menu_action_unpin") }
newtab-menu-delete-history = { COPY(from_path, "menu_action_delete") }
newtab-menu-save-to-pocket = { COPY(from_path, "menu_action_save_to_pocket") }
newtab-menu-delete-pocket = { COPY(from_path, "menu_action_delete_pocket") }
newtab-menu-archive-pocket = { COPY(from_path, "menu_action_archive_pocket") }
newtab-menu-remove-bookmark = { COPY(from_path, "menu_action_remove_bookmark") }
newtab-menu-bookmark = { COPY(from_path, "menu_action_bookmark") }

newtab-menu-copy-download-link = { COPY(from_path, "menu_action_copy_download_link") }
newtab-menu-go-to-download-page = { COPY(from_path, "menu_action_go_to_download_page") }
newtab-menu-remove-download = { COPY(from_path, "menu_action_remove_download") }

newtab-menu-show-file-mac = { COPY(from_path, "menu_action_show_file_mac_os") }
newtab-menu-show-file-windows = { COPY(from_path, "menu_action_show_file_windows") }
newtab-menu-show-file-linux = { COPY(from_path, "menu_action_show_file_linux") }
newtab-menu-show-file-default = { COPY(from_path, "menu_action_show_file_default") }
newtab-menu-open-file = { COPY(from_path, "menu_action_open_file") }

        """, from_path='browser/chrome/browser/activity-stream/newtab.properties')
    )
