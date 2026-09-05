"""Build palette ownership data for material-botanical.webp. Requires Pillow, NumPy, SciPy.

Coordinates are authored against the 1122 x 1402 source. This does not alter the art.
Red = main petal coverage; green = companion petal coverage; black = native material.
Run from any directory: python studies/botanical/generate-petal-mask.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
source = Image.open(ROOT / "astral/material-botanical.webp").convert("RGB")
assert source.size == (1122, 1402), "Re-author the contours when the material changes."

# Only boundaries between touching blooms need close tracing. In open areas,
# source pigment separates the petals from paper, foliage, and pollen.
MAIN = [
    # Focal peony, including its low outer petals.
    [(387,508),(391,480),(407,449),(439,437),(489,439),(518,423),
     (547,415),(570,423),(594,412),(625,412),(641,431),(666,443),
     (680,477),(694,506),(715,501),(741,512),(758,537),(787,554),
     (798,590),(814,612),(821,648),(811,678),(800,699),(787,720),
     (785,749),(770,776),(759,806),(721,834),(688,838),(672,864),
     (652,892),(622,908),(596,896),(567,886),(553,863),(535,839),
     (482,839),(447,826),(410,804),(383,780),(360,746),(347,717),
     (333,675),(326,643),(331,601),(350,570),(374,547)],
    # Coral dahlia behind the peony.
    [(348,416),(354,352),(397,304),(426,250),(485,250),(550,258),
     (607,303),(648,372),(643,425),(578,485),(408,492)],
    # Upper right coral ranunculus; the lower pink flower stays a companion.
    [(655,412),(690,389),(741,371),(783,377),(820,390),(869,416),(948,470),(968,586),(920,659),
     (859,675),(804,665),(762,626),(681,533)],
    # Apricot ranunculus below the focal flower.
    [(405,902),(470,869),(556,885),(596,968),(592,1055),
     (535,1114),(404,1115),(349,1046),(361,958)],
    # Three coral buds. The lowest magenta bud stays a companion.
    [(405,151),(490,156),(519,243),(407,263)],
    [(881,333),(1008,347),(1018,463),(877,465)],
    [(915,650),(1015,648),(1025,781),(946,782),(909,741),(895,698)],
]

COMPANIONS = [
    [(77,409),(172,306),(260,263),(344,265),(382,351),(391,473),
     (349,567),(249,617),(137,605),(72,542)],
    [(531,154),(558,84),(649,74),(675,115),(715,80),(787,79),
     (819,148),(868,162),(894,226),(901,297),(879,349),
     (806,383),(704,368),(652,333),(566,304),(528,241)],
    [(131,677),(194,626),(212,587),(279,610),(332,652),(372,726),
     (434,813),(415,856),(387,914),(312,949),(214,919),(144,862)],
    [(791,674),(852,689),(904,722),(932,795),(943,877),(899,940),
     (846,965),(770,929),(721,864),(707,783)],
    [(687,1004),(732,972),(810,951),(871,975),(892,1043),
     (873,1125),(826,1193),(733,1203),(657,1155),(650,1071)],
    [(656,929),(710,918),(745,944),(741,986),(696,1016),(649,985)],
]

CENTRES = [
    # Visible peony stamens. Follow the foreground petal at the lower edge.
    [(491,643),(497,617),(518,601),(542,590),(567,592),(591,604),
     (617,623),(624,643),(618,654),(613,672),(603,675),(596,676),
     (581,687),(573,697),(568,695),(562,681),(550,672),(542,660),
     (525,656),(518,647),(506,650)],
    [(668,248),(688,230),(712,231),(731,248),(742,270),(727,291),
     (704,300),(680,287),(672,271)],
]

def polygons(points):
    layer = Image.new("L", source.size)
    draw = ImageDraw.Draw(layer)
    for contour in points:
        draw.polygon(contour, fill=255)
    return layer

main = np.asarray(polygons(MAIN)) > 0
pixels = np.asarray(source, dtype=float) / 255
r, g, b = pixels.transpose(2, 0, 1)
red_share = (r - g) / np.maximum(r - b, .001)

# Snap touching seams to the warm/pink pigment edge within twenty source pixels.
# Expand exposed edges so a contour cannot leave a strip of native petal colour.
# Only a nearby companion can compete for ownership of this boundary band.
seam = distance_transform_edt(main) + distance_transform_edt(~main)
companion = np.asarray(polygons(COMPANIONS)) > 0
companion_near = distance_transform_edt(~companion) <= 10
expanded_main = distance_transform_edt(~main) <= 20
main = np.where((seam <= 20) & companion_near, red_share < .94, expanded_main)

def smooth(low, high, values):
    t = np.clip((values - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)

# Paper and green/yellow material have much less red relative to their blue loss.
# Smooth only the material edge; never blend the two selected pigment families.
coverage = smooth(.50, .57, red_share) * smooth(.025, .065, r - g)
# Restrict pigment classification to annotated flower envelopes. Brown stems
# and compression noise elsewhere must never become selectable petal material.
envelopes = polygons(MAIN + COMPANIONS).filter(ImageFilter.MaxFilter(41))
coverage *= np.asarray(envelopes) / 255
centres = np.asarray(polygons(CENTRES).filter(ImageFilter.GaussianBlur(.6))) / 255
# Retain gold/brown pollen, but do not leave a polygon-shaped patch of red
# petal behind the stamens. Foreground petal contours close the centre mask.
coverage *= 1 - centres * (1 - smooth(.72, .80, red_share))
core = polygons([[(536,642),(547,633),(561,637),(576,639),(584,650),
                  (582,667),(565,675),(548,664),(539,653)],
                 [(687,255),(709,251),(720,267),(715,280),(698,285),(685,274)]])
coverage *= 1 - np.asarray(core.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(.6))) / 255
mask = np.zeros((*main.shape, 3), dtype=np.uint8)
mask[..., 0] = np.rint(255 * coverage * main)
mask[..., 1] = np.rint(255 * coverage * ~main)
assert not np.any((mask[..., 0] > 0) & (mask[..., 1] > 0))
output = ROOT / "astral/petal-mask.png"
Image.fromarray(mask).save(output, optimize=True)
print(f"{output.name}: {output.stat().st_size:,} bytes; disjoint ownership verified")
