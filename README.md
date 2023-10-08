# fixspritesheet

- This is a simple tool mean to create a aligned spritesheet from a previous unaligned one

- FOR NOW IT ONLY WORKS FOR TRANSPARENT BACKGROUNDS

# Why 

- Some free spritesheet has bad positions and are not evenly distributed, giving some extra work 
when trying to use them, this branch is for helping fixing it without much trouble.

- Its made for my own personal use, so Im planning to adjust it only if there is really a need to.

- But its available here to help anyone that needs some tool like that.

# HOW TO USE

1- Load your spritesheet on the top left import button. (The identification will happen automatically)
2- if there is any sprites with multiple undesired selection box you can select them and use the "MERGE" button (you can select by clicking them or clicing and draggin over them)
3- To export you need to select the sprites that you want to group by line and click the button "Create Export Group"
    - One sprite can only have 1 group, and each group will be exported as a different line on the new spritesheet
4- By default All sprites are aligned by to the vertically to the bottom and horizontally to the center. 
    - To change this you can use the checkbox on each frame. those checkbox are the anchor for the alignment. So if you want the sprite to be aligned
    on the left bottom of the frame you should check the bottom and left checkbox. 
5- For getting you result you can just click on the "EXPORT ALL GROUPS" button, itll generate a new spritesheet with the groups aligned and ask you
to download it.