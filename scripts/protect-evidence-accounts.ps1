$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$target = 'F:\claps-product\md\evidence-full-process\ACCOUNTS.md'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$system = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$acl = [System.Security.AccessControl.FileSecurity]::new()
$acl.SetOwner($identity)
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @($identity, $system)) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'Allow')
    $acl.AddAccessRule($rule)
}
$existing = Get-Acl -LiteralPath $target
$existingSids = @($existing.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { $_.IdentityReference.Value })
if (-not ($existing.AreAccessRulesProtected -and $existingSids.Count -eq 2 -and $existingSids -contains $identity.Value -and $existingSids -contains 'S-1-5-18')) {
    Set-Acl -LiteralPath $target -AclObject $acl
}
$actual = Get-Acl -LiteralPath $target
$sids = @($actual.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { $_.IdentityReference.Value })
if (-not $actual.AreAccessRulesProtected -or $sids.Count -ne 2 -or $sids -notcontains $identity.Value -or $sids -notcontains 'S-1-5-18') { throw 'Evidence account ACL verification failed' }
@{ protected = $true; ownerOnlyWithSystem = $true; allowedSids = $sids; path = $target } | ConvertTo-Json -Compress
