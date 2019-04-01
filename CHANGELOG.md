# Changelog

## v0.8.0

- Save trades are now recognized by the script and can no longer be canceled from another planet.
- Fixed multiple bugs that sometimes incorrectly found trades to exceed storage capacities.
- Drone types without an amount do no longer show up in the spy listing.
- Added the ability to auto save raid priorities.
- The fleet addon now shows fleet activity for all planets, not just the current one.
- Added an option to exclude drones from fleet activity.

## v0.7.0

- The production page no longer has the ship dock in its submenu
- The fleet page now turned to a calendar page that lists all running tasks
  - Per default, the calendar only shows fleet activity, but it can list buildings, research, production, etc. as well
- The fleet page was scratched from all submenus
- Some improvements have been made to the script startup routine to speed up things and avoid errors
- **FLEETS**
  - The icon to recall a fleet now only shows up in case the fleet is on its way to the target
  - While sending fleets, you can choose a return time and the script automatically adjusts speeds
- **OVERVIEW**
  - Show energy and building slots on overview page for all planets

## v0.6.0

- All arrow keys that add or remove ships or defense bulk add them when you hold the mouse button
- Resources on the main page get highlighted when running trade would exceed their storage capacity

- **OBSERVATIONS**
  - Ability to sort observations by coords
- **MESSAGES**
  - Direct links to combat and spy reports from the message root folder
- **GALAXY**
  - Add spy links to all planets
  - Sending obs drones from the galaxy view
- **RESOURCES**
  - Page now shows the time until capacities are reached for all resources
- **TRADE**
  - Trades that would exceed storage capacities when accepted/denied are highlighted

## v0.5.2

- Fixed a bug that caused fleet movements to disappear under certain circumstances
- Fixed a bug that caused timers to not work for drone fleets

## v0.5.1

- Resolved #4: [Research confirm doesn't work](https://github.com/j0Shi82/last-war-manager/issues/4)
- Manager shouldn't get stuck on loading screens on first load.
- Fixed the alliance page so all submenu buttons are now properly displayed. Page doesn't look great, but at least its functional now.
- Deactivated scrolling on message pages to not accidentally trigger a browse whlle drafting a reply.
- The main background picture now scales on big resolutions.
- Reduced the requests per pageload and also tweaked some number so that pages should now appear faster.
- Fleets no loner trigger a page reload to avoid unwanted reloads.
- The script now applies to both www.last-war.de as well as last-war.de