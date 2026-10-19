#!/bin/bash
cd /home/claude/lun_in/x/lun
ls *.dwg | xargs -P 8 -I{} bash -c 'n=$(echo "{}" | sed "s/[ ()&]/_/g; s/\.dwg$//"); timeout 300 /home/claude/libredwg/build/dwg2dxf -y -o "/home/claude/lun_in/dxf/$n.dxf" "{}" > "/home/claude/lun_in/dxf/$n.log" 2>&1; echo "$n $?"'
