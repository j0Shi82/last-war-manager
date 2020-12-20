# Changelog

## v.1.3.x

- **FEATURES**
  - Display total res on all production and defense pages when changing the amount of ships or defenses.
  - New filter on upgrade pages that let's you filter upgrade items under a certain percentage.
  - Fleet Send Timing has been reworked and you can now choose arrival and return times separately.
  - Construction page now shows a countdown until a building can be build when there is no running construction.
  - The progress bar has been replaced. The can be turned of in the options.
  - LWM now uses the browser's native local storage when Tampermonkey functions are unavailable (unlikely, but can't hurt to have a fallback).
  - The Google API should now only get queried when drive sync is enabled. This should speed up initial load for those that don't use the Google Drive option.

- **BUGFIX**
  - Fixed some bugs that threw errors on some page reloads, but had no impact on user experience.

## v1.2.0 - 1.2.1

- **FEATURES**
  - New optional addon to replace the native resource tick timer. The LWM one works more accurately in most situations and stays activated in inactive browser windows.
  - Non-premium users now have access to the Save-All button, but it does not auto-fill res any longer, just provides the other values for LWM saves.
  - Show custom coords for premium users on new trade page
  - Disable items in the main menu if player hasn't build the corresponding buildings yet
  - Change drone fleet type to be able to distinguish between colonization flights
- **BUGFIX**
  - Fixed a bug that caused fleets from trade post to not get properly parsed for the calendar addon
  - Fixed a bug that caused click handlers designed for inbox to fire on other pages as well
  - Fixed a bug that caused the gm config to throw errors on save

## v1.1.0
- In the LWM menu there's now a button to delete the data set by the script. This can be used to wipe old data and is especially useful at the start of new rounds
- **OVERVIEW**
  - There's a new option to enable hinting at vacant multi building slots (defaults to false)
- **TRADE**
  - The trade window has been reworked and de-cluttered
  - The save button now automatically adds coords of the first available own planet to keep saving res a two-click effort
  - Add statistics of currently saved res
  - Completely hide LWM save trades, not just the buttons (feedback required)
- **MESSAGES**
  - Shorten submenu labels to avoid a spacing issue
- **FLEET**
  - If drones are hidden in the LWM settings, you can still reveal them by specifically picking them in the fleet type dropdown
  - The fleet container is now collapsible
- **RESOURCE MENU**
  - The resource tooltips now shows the sum of all incoming resources, storage capacity, and a countdown indicating when capacity will be reached

## v1.0.0
- Hovering over resource boxes now reveals percentage capacity numbers
- The Manager now offers an option to show the planet image (default is false)
- **GALAXY**
  - You can now select different galaxies using a select box
- **FLEETS**
  - Defending fleets from previous rounds should no longer show up in the calendar or fleet activity
  - Only save raid prios on premium accounts
- **TRADES**
  - Premium features like saving all res are now only available for premium users
- **MEMO**
  - The premium feature is now accessible through the main menu for premium users
  - Ability to choose between showing the memo on top of the page or inline
- **OVERVIEW**
  - LWM now supports SmartView
  - Highlight empty building and research slots => clicks directly lead to the building and research page

## v0.8.0

- The Google Drive saves are loaded once per login, not once per planet change
- **TRADE**
  - Save trades are now recognized by the script and can no longer be canceled from another planet
  - Fixed multiple bugs that sometimes incorrectly found trades to exceed storage capacities
  - Added an option to bulk accept / deny trades
- **ESPIONAGE**
  - Drone types without an amount do no longer show up in the spy listing
- **FLEETS**
  - Added the ability to auto save raid priorities
  - The fleet addon now shows fleet activity for all recently visited planets, not just the current one
  - Added an option to exclude drones from fleet activity
  - Fleets on their way back now have an info icon that leads to the fleet info
  - Fleets received a visual upgrade and can be filtered by coords, type, and status
  - In case the fleet addon is deactivated, fleets show up again on the old fleet / now calendar page
  - The original speed of fleets was added to the fleet table
- **OVERVIEW**
  - Fleet warning distance shows on the overview page
- **CALENDAR**
  - The calendar now groups similar entries to avoid too many rows
- **OBSERVATIONS**
  - You can now re-send drones from the obs page
  - Planets with existing observation drones are now marked in the galaxy view and instead of sending an obs drone open the existing obs report
  - The level of camouflage technology now shows on the obs page for known planets
  - Active obs for planets that fleets are currently attacking can now be opened from the fleet menu. If no ob active, the script offers to send a spy drone
  - Option added to open obs reports in new tabs instead of new windows
- **GALAXY**
  - The level of camouflage technology now shows in the galaxy view for known planets
- **PRODUCTION**
  - Input fields on production pages listen to the enter key
- **BANK**
  - Added buttons to the bank page to fill bank and withdraw interest

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
- Resources on the main page get highlighted when running trades would exceed their storage capacity
- **OBSERVATIONS**
  - Ability to sort observations by coords
- **MESSAGES**
  - Direct links to combat and spy reports from the message root folder
- **GALAXY**
  - Add spy links to all planets
  - Sending obs drones from the galaxy view
- **RESOURCES**
  - The page now shows the time until capacities are reached for all resources
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
