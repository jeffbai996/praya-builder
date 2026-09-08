const assert=require('node:assert/strict');
async function setTheme(page,theme){
  for(let i=0;i<3&&await page.getAttribute('html','data-theme')!==theme;i++)await page.locator('#theme-toggle').click();
  assert.equal(await page.getAttribute('html','data-theme'),theme);
}
module.exports={setTheme};
