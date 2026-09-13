const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetSync = `    // Fetch users, laws, categories, settings, supervisors, related sites, partners, platform about, and contact concurrently in parallel
    const [cloudUsers, cloudLaws, cloudCategories, cloudSettings, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudAbout, cloudContact] = await Promise.all([
      fetchUsersFromFirestore(),
      fetchLawsFromFirestore(),
      fetchCategoriesFromFirestore(),
      fetchSettingsFromFirestore(),
      fetchSupervisorsFromFirestore(),
      fetchRelatedSitesFromFirestore(),
      fetchPartnersFromFirestore(),
      fetchPlatformAboutFromFirestore(),
      fetchContactInfoFromFirestore(),
    ]);`;

const replacementSync = `    // Fetch collections sequentially to prevent Vercel Serverless OOM (Out of Memory) crashes
    const cloudSettings = await fetchSettingsFromFirestore();
    const cloudAbout = await fetchPlatformAboutFromFirestore();
    const cloudContact = await fetchContactInfoFromFirestore();
    const cloudCategories = await fetchCategoriesFromFirestore();
    const cloudSupervisors = await fetchSupervisorsFromFirestore();
    const cloudRelatedSites = await fetchRelatedSitesFromFirestore();
    const cloudPartners = await fetchPartnersFromFirestore();
    
    // Fetch heavy collections last
    const cloudUsers = await fetchUsersFromFirestore();
    const cloudLaws = await fetchLawsFromFirestore();`;

code = code.replace(targetSync, replacementSync);
fs.writeFileSync('server.ts', code);
console.log("Updated syncWithFirestore to be sequential");
