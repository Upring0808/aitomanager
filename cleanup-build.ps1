# Cleanup script for Android build issues
Write-Host "🧹 Cleaning up build files..." -ForegroundColor Green

# Remove Android build directories
if (Test-Path "android\build") {
    Remove-Item -Recurse -Force "android\build"
    Write-Host "✅ Removed android\build" -ForegroundColor Green
}

if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle"
    Write-Host "✅ Removed android\.gradle" -ForegroundColor Green
}

if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build"
    Write-Host "✅ Removed android\app\build" -ForegroundColor Green
}

# Remove user gradle cache
$gradleCache = "$env:USERPROFILE\.gradle"
if (Test-Path $gradleCache) {
    Remove-Item -Recurse -Force $gradleCache
    Write-Host "✅ Removed user gradle cache" -ForegroundColor Green
}

# Clear npm cache
Write-Host "🧹 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Clear expo cache
Write-Host "🧹 Clearing expo cache..." -ForegroundColor Yellow
npx expo start --clear

Write-Host "✅ Cleanup completed!" -ForegroundColor Green
Write-Host "💡 Now try: npx expo run:android" -ForegroundColor Cyan 