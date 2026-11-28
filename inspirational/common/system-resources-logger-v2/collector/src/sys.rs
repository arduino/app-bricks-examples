// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! Filesystem access rooted at a configurable prefix, plus a few libc helpers.

use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;

#[derive(Clone, Debug)]
pub struct Sys {
    root: PathBuf,
}

impl Sys {
    pub fn new(root: &str) -> Self {
        Sys { root: PathBuf::from(root) }
    }

    pub fn is_real_root(&self) -> bool {
        self.root == Path::new("/")
    }

    pub fn p(&self, rel: &str) -> PathBuf {
        self.root.join(rel.trim_start_matches('/'))
    }

    pub fn read(&self, rel: &str) -> Option<String> {
        fs::read_to_string(self.p(rel)).ok()
    }

    /// Reads a file, trimming whitespace and the NUL terminators of device-tree strings.
    pub fn read_trim(&self, rel: &str) -> Option<String> {
        let raw = fs::read(self.p(rel)).ok()?;
        let s = String::from_utf8_lossy(&raw);
        let s = s.trim_matches(|c: char| c.is_whitespace() || c == '\0').replace('\0', " ");
        (!s.is_empty()).then_some(s)
    }

    pub fn read_num<T: FromStr>(&self, rel: &str) -> Option<T> {
        self.read_trim(rel)?.split_whitespace().next()?.parse().ok()
    }

    pub fn exists(&self, rel: &str) -> bool {
        self.p(rel).exists()
    }

    /// Sorted entry names of a directory, empty when it cannot be read.
    pub fn list(&self, rel: &str) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(self.p(rel))
            .map(|rd| rd.filter_map(|e| e.ok()).map(|e| e.file_name().to_string_lossy().into_owned()).collect())
            .unwrap_or_default();
        names.sort_by(|a, b| natural_cmp(a, b));
        names
    }

    pub fn link_name(&self, rel: &str) -> Option<String> {
        let target = fs::read_link(self.p(rel)).ok()?;
        Some(target.file_name()?.to_string_lossy().into_owned())
    }

    pub fn detect_scope(&self) -> &'static str {
        if self.exists(".dockerenv") || self.exists("run/.containerenv") {
            "container"
        } else {
            "host"
        }
    }
}

/// Orders "thermal_zone2" before "thermal_zone10".
fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let split = |s: &str| {
        let i = s.trim_end_matches(|c: char| c.is_ascii_digit()).len();
        (s[..i].to_string(), s[i..].parse::<u64>().unwrap_or(0))
    };
    split(a).cmp(&split(b)).then_with(|| a.cmp(b))
}

pub fn read_f64(path: &Path) -> Option<f64> {
    fs::read_to_string(path).ok()?.split_whitespace().next()?.parse().ok()
}

#[cfg(unix)]
pub fn clk_tck() -> f64 {
    let v = unsafe { libc::sysconf(libc::_SC_CLK_TCK) };
    if v > 0 { v as f64 } else { 100.0 }
}

#[cfg(not(unix))]
pub fn clk_tck() -> f64 {
    100.0
}

#[cfg(unix)]
pub fn page_size() -> u64 {
    let v = unsafe { libc::sysconf(libc::_SC_PAGESIZE) };
    if v > 0 { v as u64 } else { 4096 }
}

#[cfg(not(unix))]
pub fn page_size() -> u64 {
    4096
}

/// (total, used, available) bytes of the filesystem holding `path`, like `df`.
#[cfg(unix)]
pub fn disk_usage(path: &str) -> Option<(u64, u64, u64)> {
    let c = std::ffi::CString::new(path).ok()?;
    let mut s: libc::statvfs = unsafe { std::mem::zeroed() };
    if unsafe { libc::statvfs(c.as_ptr(), &mut s) } != 0 {
        return None;
    }
    let frsize = s.f_frsize as u64;
    let total = s.f_blocks as u64 * frsize;
    let free = s.f_bfree as u64 * frsize;
    let avail = s.f_bavail as u64 * frsize;
    Some((total, total.saturating_sub(free), avail))
}

#[cfg(not(unix))]
pub fn disk_usage(_path: &str) -> Option<(u64, u64, u64)> {
    None
}

/// Global IP addresses per interface (loopback and IPv6 link-local skipped).
#[cfg(unix)]
pub fn ip_addresses() -> Vec<(String, String)> {
    use std::ffi::CStr;
    use std::net::{Ipv4Addr, Ipv6Addr};

    let mut out = Vec::new();
    unsafe {
        let mut ifap: *mut libc::ifaddrs = std::ptr::null_mut();
        if libc::getifaddrs(&mut ifap) != 0 {
            return out;
        }
        let mut cur = ifap;
        while !cur.is_null() {
            let ifa = &*cur;
            cur = ifa.ifa_next;
            if ifa.ifa_addr.is_null() || ifa.ifa_name.is_null() {
                continue;
            }
            let name = CStr::from_ptr(ifa.ifa_name).to_string_lossy().into_owned();
            if name == "lo" {
                continue;
            }
            match (*ifa.ifa_addr).sa_family as i32 {
                libc::AF_INET => {
                    let sin = &*(ifa.ifa_addr as *const libc::sockaddr_in);
                    out.push((name, Ipv4Addr::from(u32::from_be(sin.sin_addr.s_addr)).to_string()));
                }
                libc::AF_INET6 => {
                    let sin6 = &*(ifa.ifa_addr as *const libc::sockaddr_in6);
                    let ip = Ipv6Addr::from(sin6.sin6_addr.s6_addr);
                    if !ip.is_loopback() && (ip.segments()[0] & 0xffc0) != 0xfe80 {
                        out.push((name, ip.to_string()));
                    }
                }
                _ => {}
            }
        }
        libc::freeifaddrs(ifap);
    }
    out
}

#[cfg(not(unix))]
pub fn ip_addresses() -> Vec<(String, String)> {
    Vec::new()
}
