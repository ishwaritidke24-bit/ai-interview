async function testGen() {
  console.log("Starting generation...");
  try {
    const res = await fetch('http://localhost:3001/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: "Software Engineer",
        jobDescription: "Must know React and Node.js. 5 years experience.",
        companyUrl: "https://example.com"
      })
    });
    
    const data = await res.json();
    console.log("Kit started:", data);
    
    if (!data.kitId) {
      console.log("No kitId returned!");
      return;
    }

    const kitId = data.kitId;
    let status = data.status;
    
    while (status !== 'completed' && status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`http://localhost:3001/api/kits/${kitId}/status`);
      const pollData = await pollRes.json();
      
      if (pollData.status !== status || pollData.error) {
        console.log(`Status: ${pollData.status}`);
        if (pollData.error) console.log(`Error: ${pollData.error}`);
        status = pollData.status;
      }
    }
    
    console.log("Final status:", status);
  } catch (err) {
    console.error("Test script failed:", err);
  }
}
testGen();
