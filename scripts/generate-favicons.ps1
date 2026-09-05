param(
    [string]$Source = "static/images/avatar.png"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$sourceImage = [System.Drawing.Bitmap]::FromFile($sourcePath)

try {
    $left = $sourceImage.Width
    $top = $sourceImage.Height
    $right = -1
    $bottom = -1

    for ($y = 0; $y -lt $sourceImage.Height; $y++) {
        for ($x = 0; $x -lt $sourceImage.Width; $x++) {
            if ($sourceImage.GetPixel($x, $y).A -gt 8) {
                if ($x -lt $left) { $left = $x }
                if ($x -gt $right) { $right = $x }
                if ($y -lt $top) { $top = $y }
                if ($y -gt $bottom) { $bottom = $y }
            }
        }
    }

    if ($right -lt $left -or $bottom -lt $top) {
        throw "The source logo has no visible pixels."
    }

    $crop = [System.Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
    $targets = @(
        @{ Size = 16; Path = "static/favicon-16x16.png" },
        @{ Size = 32; Path = "static/favicon-32x32.png" },
        @{ Size = 180; Path = "static/apple-touch-icon.png" }
    )

    foreach ($target in $targets) {
        $size = [int]$target.Size
        $canvas = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($canvas)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

                $usable = $size * 0.90
                $scale = [Math]::Min($usable / $crop.Width, $usable / $crop.Height)
                $drawWidth = [Math]::Max(1, [int][Math]::Round($crop.Width * $scale))
                $drawHeight = [Math]::Max(1, [int][Math]::Round($crop.Height * $scale))
                $drawX = [int][Math]::Floor(($size - $drawWidth) / 2)
                $drawY = [int][Math]::Floor(($size - $drawHeight) / 2)
                $destination = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawWidth, $drawHeight

                $graphics.DrawImage($sourceImage, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
            }
            finally {
                $graphics.Dispose()
            }

            $outputPath = Join-Path (Get-Location) $target.Path
            $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $canvas.Dispose()
        }
    }
}
finally {
    $sourceImage.Dispose()
}

