function g(a){
  z=' un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt'.split(' ');
  z[30]="trente";
  z[40]="quarante";
  z[50]="cinquante";
  z[60]="soixante";
  z[80]="quatre-vingt";
  z[100]="cent";
  k;
  b=a;
  while(!k) {
    a--;
    if (z[a]) {
      c=b-a;
      k=z[a]+(c-1&&c-11||a>79?"-":" et ")+z[c]
    }
  }
  return 80==a?z[b]+'s':z[b]||k;
}

' un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt'

".un.deux.trois.quatre.cinq.six.sept.huit.neuf.dix.onze.douze.treize.quatorze.quinze.seize.dix-sept.dix-huit.dix-neuf.vingt..........trente..........quarante..........cinquante..........soixante"



"32,117,110,32,100,101,117,120,32,116,114,111,105,115,32,113,117,97,116,114,101,32,99,105,110,113,32,115,105,120,32,115,101,112,116,32,104,117,105,116,32,110,101,117,102,32,100,105,120,32,111,110,122,101,32,100,111,117,122,101,32,116,114,101,105,122,101,32,113,117,97,116,111,114,122,101,32,113,117,105,110,122,101,32,115,101,105,122,101,32,100,105,120,45,115,101,112,116,32,100,105,120,45,104,117,105,116,32,100,105,120,45,110,101,117,102,32,118,105,110,103,116"

f[i] << 10 | f[i+1] << 5 | f[i+2]

11111100 | (10000000 | f[i] ) >> 8 | (10000000 | f[i+1] ) >> (2*8) | (10000000 | f[i+2] ) >> (3*8) | (10000000 | f[i+3] ) >> (4*8) | (10000000 | f[i+4] ) >> (5*8)
