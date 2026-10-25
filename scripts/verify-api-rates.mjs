async function verify() {
  const res = await fetch("http://localhost:3000/api/transcript-requests?countryCode=NG");
  const data = await res.json();
  const targetStates = [
    "Anambra",
    "Imo",
    "Delta",
    "Ebonyi",
    "Abia",
    "Enugu",
    "Rivers",
    "Rivers (Port Harcourt)",
    "Port Harcourt (Rivers)"
  ];
  const matches = data.states.filter((s) => targetStates.includes(s.stateName));
  console.log("Matching states returned by API:");
  for (const item of matches) {
    console.log(` - ${item.stateName}: N${(item.priceKobo / 100).toLocaleString("en-NG")} (${item.priceKobo} kobo)`);
  }
}

verify().catch(console.error);
