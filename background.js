// 后台服务，处理Tab页打开
chrome.runtime.onInstalled.addListener(() => {
  console.log('JSON Formatter扩展已安装');
  
  // 创建右键菜单
  createContextMenus();
});

// 创建右键菜单
function createContextMenus() {
  // 创建主菜单
  chrome.contextMenus.create({
    id: 'phpJsonFormat',
    title: 'phpJsonFormat',
    contexts: ['selection'] // 只在选中文本时显示
  });
  
  // 创建子菜单 - request转queryStr
  chrome.contextMenus.create({
    id: 'requestToQuery',
    parentId: 'phpJsonFormat',
    title: 'request转queryStr',
    contexts: ['selection'] // 只在选中文本时显示
  });
}

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'requestToQuery' && info.selectionText) {
    // 获取选中的内容
    const selectedText = info.selectionText;
    
    // 打开tab.html页面，并传递选中的内容
    const tabUrl = chrome.runtime.getURL('tab.html') + '?requestContent=' + encodeURIComponent(selectedText);
    
    chrome.tabs.create({ url: tabUrl });
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openInTab') {
    openInNewTab();
    sendResponse({ success: true });
  } else if (request.action === 'popupClosed') {
    // 当popup关闭时，清除popup设置，以便下次点击图标时触发onClicked事件
    chrome.action.setPopup({ popup: '' });
  } else if (request.action === 'updateDefaultViewMode') {
    // 当默认打开方式更改时，根据新的设置清除或保留popup设置
    if (request.mode === 'tab') {
      chrome.action.setPopup({ popup: '' });
    }
    sendResponse({ success: true });
  }
});

// 在独立标签页打开格式化工具
function openInNewTab() {
  const tabUrl = chrome.runtime.getURL('tab.html');
  
  // 直接创建新标签页，每次点击都打开新的tab.html
  chrome.tabs.create({ url: tabUrl });
}

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(['defaultViewMode'], (result) => {
    const defaultMode = result.defaultViewMode || 'tab';
    
    if (defaultMode === 'tab') {
      openInNewTab();
    } else {
      // 打开popup
      chrome.action.setPopup({ popup: 'popup.html' });
      chrome.action.openPopup();
    }
  });
});