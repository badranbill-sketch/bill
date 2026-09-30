import re,zlib,sys,glob,hashlib,os
for f in sorted(glob.glob(sys.argv[1]+'/*.pdf')):
    d=open(f,'rb').read()
    # count page objects in raw and in decompressed object streams
    blobs=[d]
    for m in re.finditer(rb'stream\r?\n',d):
        s=m.end(); e=d.find(b'endstream',s)
        try: blobs.append(zlib.decompress(d[s:e]))
        except Exception: pass
    pages=sum(len(re.findall(rb'/Type\s*/Page(?![s\w])',b)) for b in blobs)
    counts=[int(x) for b in blobs for x in re.findall(rb'/Type\s*/Pages\b[^>]*?/Count\s+(\d+)',b)] + [int(x) for b in blobs for x in re.findall(rb'/Count\s+(\d+)[^>]*?/Type\s*/Pages\b',b)]
    print(os.path.basename(f), os.path.getsize(f), 'page_objects', pages, 'pages_count', counts, hashlib.sha256(d).hexdigest()[:16])
