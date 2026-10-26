/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  module._compile(output, filename);
};

const { buildTransferLinks, googleMapsRouteUrl } = require("../app/lezioni/in-programma/transfer-links.ts");
const { selectOccurrencesInRange } = require("../app/data/calendario/calendar-selectors.ts");
const { createSingleOccurrenceException } = require("../app/data/calendario/calendar-recurrence.ts");
const location = { street: "Via Esempio", streetNumber: "27", city: "Misano Adriatico", province: "RN", country: "Italia" };
const students = [
  { id: "giulia", address: "Via San Martino 80", city: "Riccione", province: "RN", postalCode: "47838" },
  { id: "lorenzo", address: "Viale Lazio 10", city: "Riccione", province: "RN", postalCode: "47838" },
];
const first = { occurrenceId: "appointment:first", studentId: "giulia", date: "2026-10-19", startTime: "15:00", durationMinutes: 60, mode: "domicilio", status: "confermata" };
const second = { ...first, occurrenceId: "appointment:second", studentId: "lorenzo", startTime: "16:30" };

test("prima lezione a domicilio usa la sede e non presume la partenza dopo una lezione online", () => {
  const links = buildTransferLinks([[first.date, [first]]], new Set([first.occurrenceId]), students, location);
  assert.equal(links.length, 1);
  assert.equal(links[0].kind, "first");
  assert.equal(links[0].from.street, location.street);
  assert.equal(links[0].to.street, "Via San Martino");
  assert.equal(buildTransferLinks([[first.date, [first]]], new Set(["earlier-online"]), students, location).length, 0);
  assert.equal(buildTransferLinks([[first.date, [{ ...first, mode: "casa" }]]], new Set([first.occurrenceId]), students, location).length, 0);
});

test("solo lezioni fisiche consecutive dello stesso giorno con intervallo da 0 a 120 minuti", () => {
  for (const [time, interval, expected] of [["16:00", 0, true], ["16:30", 30, true], ["18:00", 120, true], ["18:01", 121, false]]) {
    const links = buildTransferLinks([[first.date, [first, { ...second, startTime: time }]]], new Set(), students, location);
    assert.equal(links.length > 0, expected, String(time));
    if (expected) assert.equal(links[0].interval, interval);
  }
  assert.equal(buildTransferLinks([[first.date, [first, { ...second, startTime: "15:30" }]]], new Set(), students, location).length, 0);
  assert.equal(buildTransferLinks([[first.date, [first]], ["2026-10-20", [{ ...second, date: "2026-10-20" }]]], new Set(), students, location).length, 0);
  assert.equal(buildTransferLinks([[first.date, [{ ...first, mode: "online" }, second]]], new Set(), students, location).length, 0);
});

test("prima lezione svolta, seconda programmata: percorso ancora disponibile; annullate escluse", () => {
  const completed = { ...first, status: "svolta" };
  const cancelled = { ...first, occurrenceId: "appointment:cancelled", status: "annullata", startTime: "16:10" };
  const links = buildTransferLinks([[first.date, [completed, cancelled, second]]], new Set([completed.occurrenceId]), students, location);
  assert.equal(links.length, 2);
  assert.equal(links[1].id, `${completed.occurrenceId}>${second.occurrenceId}`);
  assert.equal(links[1].interval, 30);
  const url = new URL(googleMapsRouteUrl(links[1].from, links[1].to));
  assert.match(url.searchParams.get("origin"), /Via San Martino 80/);
  assert.match(url.searchParams.get("destination"), /Viale Lazio 10/);
});

test("indirizzi mancanti o identici non creano collegamenti", () => {
  assert.equal(buildTransferLinks([[first.date, [first, second]]], new Set(), [{ ...students[0], address: "Via senza civico" }, students[1]], location).length, 0);
  assert.equal(buildTransferLinks([[first.date, [first, second]]], new Set(), [students[0], { ...students[1], address: students[0].address }], location).length, 0);
  assert.equal(buildTransferLinks([[first.date, [first]]], new Set([first.occurrenceId]), students, { ...location, streetNumber: "" }).length, 0);
});

test("Google Maps riceve origine e destinazione effettive, senza mezzo prefissato", () => {
  const [link] = buildTransferLinks([[first.date, [first, second]]], new Set(), students, location);
  const url = new URL(googleMapsRouteUrl(link.from, link.to));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/dir/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), "Via San Martino 80, 47838 Riccione (RN), Italia");
  assert.equal(url.searchParams.get("destination"), "Viale Lazio 10, 47838 Riccione (RN), Italia");
  assert.equal(url.searchParams.has("travelmode"), false);
});

test("annullamenti ed eccezioni ricorrenti seguono il selettore del Calendario", () => {
  const common = { studentId: "giulia", studentNameSnapshot: "Giulia [TEST]", subject: "Matematica", durationMinutes: 60,
    mode: "domicilio", status: "confermata", topic: "", notes: "", hourlyRateCents: 2000, lessonAmountCents: 2000,
    paidAmountCents: 0, paymentStatus: "non_pagata", source: "manuale", createdAt: "2026-10-18T10:00:00Z", updatedAt: "2026-10-18T10:00:00Z" };
  const series = { ...common, id: "weekly", startsOn: first.date, startTime: "15:00", recurrence: { frequency: "weekly", intervalWeeks: 1 } };
  const canceled = createSingleOccurrenceException(series, first.date, "exception", { status: "annullata" });
  const other = { ...common, id: "other", studentId: "lorenzo", date: first.date, startTime: "16:30" };
  const canceledDay = selectOccurrencesInRange([canceled, other], [series], first.date, first.date).filter((item) => item.status !== "annullata");
  assert.equal(buildTransferLinks([[first.date, canceledDay]], new Set([canceledDay[0].occurrenceId]), students, location).length, 1);
  const nextWeek = selectOccurrencesInRange([canceled, other], [series], "2026-10-26", "2026-10-26");
  assert.equal(nextWeek.length, 1);
  assert.equal(buildTransferLinks([["2026-10-26", nextWeek]], new Set([nextWeek[0].occurrenceId]), students, location).length, 1);
});
