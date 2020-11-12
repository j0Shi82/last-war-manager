const pageTriggersLoadingSpinner = (url, page) => {
  const processPages = ['get_inbox_message', 'get_message_info', 'get_galaxy_view_info', 'get_inbox_load_info', 'get_make_command_info',
    'get_info_for_flotten_pages', 'get_change_flotten_info'];
  const ignoreContentPages = ['make_command', 'galaxy_view', 'change_flotten', 'flottenkommando', 'flottenbasen_all', 'fremde_flottenbasen', 'flottenbasen_planet'];

  return ((url.match(/content/) && !ignoreContentPages.includes(page)) || processPages.includes(page));
};

const pageSavesResponse = (page) => {
  const saveResponsePages = ['get_production_info', 'get_aktuelle_production_info', 'get_ubersicht_info', 'get_flottenbewegungen_info', 'get_inbox_message', 'get_info_for_observationen_page', 'get_spionage_info', 'get_trade_offers', 'put_fleets', 'delete_fleets', 'put_change_flotten', 'put_building', 'cancel_building', 'put_research', 'cancel_research', 'get_new_trade_offer_info'];

  return saveResponsePages.includes(page);
};

const pagePreservesSubmenu = (page) => {
  const preserveSubmenuPages = ['get_inbox_message', 'get_message_info'];

  return preserveSubmenuPages.includes(page);
};

const pageProcessesContent = (url, page) => {
  const processPages = ['get_inbox_message', 'get_message_info', 'get_galaxy_view_info', 'get_inbox_load_info', 'get_make_command_info', 'get_info_for_flotten_pages', 'get_change_flotten_info', 'get_trade_offers', 'get_flotten_informations_info', 'get_spionage_info', 'get_bank_info'];
  const ignoreContentPages = ['spionage', 'inbox', 'trade_offer', 'make_command', 'galaxy_view', 'change_flotten', 'flottenkommando',
    'flottenbasen_all', 'fremde_flottenbasen', 'flottenbasen_planet', 'flotten_informations', 'bank'];

  return ((url.match(/content/) && !ignoreContentPages.includes(page)) || processPages.includes(page));
};

export {
  pageTriggersLoadingSpinner, pageSavesResponse, pagePreservesSubmenu, pageProcessesContent,
};
