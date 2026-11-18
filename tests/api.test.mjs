// Funções do servidor que não dependem de rede.
import test from "node:test";
import assert from "node:assert/strict";
import { coords } from "../api/local.js";
import { pontos } from "../api/inmetro.js";
import tile from "../api/tile.js";

const resposta = () => {
  const r = { st: 0, h: {}, status(s) { r.st = s; return r }, end() { return r }, json(j) { r.j = j; return r }, setHeader(k, v) { r.h[k] = v }, send() { return r } };
  return r;
};

test("coordenadas: link do Google Maps, texto e graus/minutos/segundos", () => {
  assert.deepEqual(coords("https://www.google.com/maps/place/x/@-16.7012345,-49.2654321,17z"), { lat: -16.7012345, lon: -49.2654321 });
  assert.deepEqual(coords("https://maps.google.com/?x=1!3d-16.5!4d-49.25"), { lat: -16.5, lon: -49.25 });
  assert.deepEqual(coords("-16,7012, -49,2654"), { lat: -16.7012, lon: -49.2654 });
  const g = coords(`16°42'02.9"S 49°16'49.1"W`);
  assert.ok(Math.abs(g.lat + 16.70081) < 1e-4 && Math.abs(g.lon + 49.28031) < 1e-4);
  assert.equal(coords("Rua 10, Inhumas"), null);
});

test("INMETRO: modelo igual vale 10; módulo de outra potência não serve", () => {
  assert.equal(pontos("MIN 6000TL-XH", "min 6000tl-xh", 0), 10);
  assert.equal(pontos("HN19RN-72H610W", "HN19RN-72H620W", 620), 1);
  assert.ok(pontos("HN19RN-72H600W-620W", "HN19RN-72H620W", 620) >= 5);
});

test("imagem de satélite exige login", async () => {
  process.env.SUPABASE_URL = "http://127.0.0.1:9"; process.env.SUPABASE_ANON_KEY = "x";
  const r1 = resposta(); await tile({ query: { z: "3", x: "1", y: "1" }, headers: {} }, r1);
  assert.equal(r1.st, 401);
  const r2 = resposta(); await tile({ query: { z: "3", x: "99", y: "1" }, headers: {} }, r2);
  assert.equal(r2.st, 400);
});
