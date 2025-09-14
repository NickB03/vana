import { test } from '@playwright/test';

test('Debug CSS layout structure', async ({ page }) => {
  await page.goto('http://localhost:3000/chat');
  await page.waitForTimeout(2000);
  
  // Get the complete DOM structure and CSS
  const layoutInfo = await page.evaluate(() => {
    const results: any = {};
    
    // Check for sidebar wrapper
    const wrapper = document.querySelector('[class*="sidebar-wrapper"]') || document.querySelector('.group\\/sidebar-wrapper');
    if (wrapper) {
      const styles = window.getComputedStyle(wrapper);
      results.wrapper = {
        className: wrapper.className,
        display: styles.display,
        width: styles.width,
        '--sidebar-width': styles.getPropertyValue('--sidebar-width')
      };
    }
    
    // Check sidebar component
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    if (sidebar) {
      const styles = window.getComputedStyle(sidebar);
      results.sidebar = {
        className: sidebar.className,
        display: styles.display,
        position: styles.position,
        width: styles.width,
        left: styles.left,
        zIndex: styles.zIndex
      };
    }
    
    // Check the peer element that should create space
    const peer = document.querySelector('.peer');
    if (peer) {
      const styles = window.getComputedStyle(peer);
      results.peer = {
        className: peer.className,
        display: styles.display,
        width: styles.width,
        position: styles.position
      };
    }
    
    // Check SidebarInset (main element)
    const main = document.querySelector('main');
    if (main) {
      const styles = window.getComputedStyle(main);
      results.main = {
        className: main.className,
        display: styles.display,
        position: styles.position,
        width: styles.width,
        marginLeft: styles.marginLeft,
        paddingLeft: styles.paddingLeft,
        left: styles.left,
        flex: styles.flex
      };
    }
    
    // Check if we have the correct sidebar structure
    results.structure = {
      hasSidebarProvider: !!document.querySelector('[class*="sidebar-wrapper"]'),
      hasSidebar: !!document.querySelector('[data-sidebar="sidebar"]'),
      hasSidebarInset: !!document.querySelector('main'),
      totalElements: document.querySelectorAll('*').length
    };
    
    return results;
  });
  
  console.log('Layout CSS Debug Info:');
  console.log(JSON.stringify(layoutInfo, null, 2));
});