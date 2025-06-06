function splitmix32(a: number) {
 const func = function() {
   a |= 0;
   a = a + 0x9e3779b9 | 0;
   let t = a ^ a >>> 16;
   t = Math.imul(t, 0x21f0aaad);
   t = t ^ t >>> 15;
   t = Math.imul(t, 0x735a2d97);
   return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
  }
  for(let i = 0; i < 30; i++) {
    func();
  }
  return func;
}

export const worldRand = splitmix32(12345);
// export const prng = splitmix32((Math.random()*2**32)>>>0)