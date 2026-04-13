// ============== CÁC HÀM TIỆN ÍCH ==============

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function getMondayFromOffset(offset) {
  const now = new Date();
  const currentMonday = new Date(now);
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  currentMonday.setDate(now.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(currentMonday.getDate() + offset * 7);
  return targetMonday;
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Tạo key cho localStorage dựa trên tuần
function getWeekKey(mondayDate) {
  const weekNumber = getWeekNumber(mondayDate);
  const year = mondayDate.getFullYear();
  return `spa_custom_pairs_${year}_${weekNumber}`;
}

// Tạo cặp tự động theo round-robin (hỗ trợ số lẻ)
function generateAutoPairs(employees, weekNumber) {
  if (!employees.length) return [];
  
  const n = employees.length;
  
  // Xoay vòng danh sách
  const rotationCount = (weekNumber - 1) % n;
  const rotated = [
    ...employees.slice(rotationCount),
    ...employees.slice(0, rotationCount)
  ];
  
  // Chia thành các nhóm (mỗi nhóm có thể 1 hoặc 2 người)
  const groups = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      // Nếu còn 1 người cuối cùng
      if (i === n - 1) {
        groups.push([rotated[i]]);
      } else {
        groups.push([rotated[i], rotated[i + 1]]);
      }
    }
  }
  
  return groups;
}

// Tạo lịch từ groups (áp dụng luật đảo ca)
function generateScheduleFromGroups(groups, mondayDate) {
  if (!groups.length) return [];
  
  const schedule = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(mondayDate);
    currentDate.setDate(mondayDate.getDate() + i);
    const dayOfWeek = i + 1;
    
    if (dayOfWeek === 1) {
      // Thứ 2: tất cả nhân viên
      const allEmployees = groups.flat();
      schedule.push({
        date: currentDate,
        dayOfWeek: 1,
        allEmployees: allEmployees,
        shiftA: [],
        shiftB: []
      });
    } else {
      const dayIndex = dayOfWeek - 2; // 0=Thứ3, 1=Thứ4, 2=Thứ5, 3=Thứ6, 4=Thứ7, 5=CN
      const group1IsA = (dayIndex % 2 === 0); // Thứ3,5,7: group1=A; Thứ4,6,CN: group1=B
      
      const shiftAEmployees = [];
      const shiftBEmployees = [];
      
      groups.forEach((group, groupIndex) => {
        const isShiftA = (groupIndex === 0) ? group1IsA : !group1IsA;
        if (isShiftA) {
          shiftAEmployees.push(...group);
        } else {
          shiftBEmployees.push(...group);
        }
      });
      
      schedule.push({
        date: currentDate,
        dayOfWeek: dayOfWeek,
        allEmployees: [],
        shiftA: shiftAEmployees,
        shiftB: shiftBEmployees
      });
    }
  }
  
  return schedule;
}

// ============== HOOK QUẢN LÝ MODAL ==============
const useModalLock = (isOpen) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);
};

// ============== COMPONENT MODAL EMPLOYEE ==============
const EmployeeModal = ({ isOpen, onClose, onSave, initialEmployees }) => {
  const [inputText, setInputText] = React.useState('');
  useModalLock(isOpen);
  
  React.useEffect(() => {
    if (isOpen) {
      setInputText(initialEmployees.join('\n'));
    }
  }, [isOpen, initialEmployees]);
  
  const handleSave = () => {
    const names = inputText
      .split(/[,\n]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      alert('⚠️ Vui lòng nhập ít nhất 1 nhân viên!');
      return;
    }
    
    onSave(names);
    onClose();
  };
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-content">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">📝 Cập nhật danh sách nhân viên</h2>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-3">
            Nhập tên nhân viên, mỗi tên trên một dòng hoặc cách nhau bằng dấu phẩy
          </p>
          <p className="text-xs text-blue-500 mb-4">
            💡 * Số lượng nhân viên có thể là số chẵn hoặc lẻ (1,2,3,4,5,...)
          </p>
          <textarea
            className="w-full h-48 md:h-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-base"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ví dụ:&#10;Nguyễn Thị An,&#10;Trần Văn Bình,&#10;Lê Thị Hương,&#10;Phạm Văn Đức,&#10;Hoàng Thị Mai"
          />
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold min-h-[44px]"
            >
              ❌ Hủy
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold min-h-[44px]"
            >
              💾 Lưu danh sách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== COMPONENT EDIT GROUPS MODAL ==============
const EditGroupsModal = ({ isOpen, onClose, groups, onSave, employees }) => {
  const [editableGroups, setEditableGroups] = React.useState([]);
  const [unassignedEmployees, setUnassignedEmployees] = React.useState([]);
  useModalLock(isOpen);
  
  React.useEffect(() => {
    if (isOpen && groups) {
      setEditableGroups(JSON.parse(JSON.stringify(groups)));
      
      // Tìm nhân viên chưa được ghép nhóm
      const assigned = groups.flat();
      const unassigned = employees.filter(emp => !assigned.includes(emp));
      setUnassignedEmployees(unassigned);
    }
  }, [isOpen, groups, employees]);
  
  const moveEmployee = (employee, fromGroupIdx, toGroupIdx) => {
    const newGroups = [...editableGroups];
    
    // Xóa employee khỏi group cũ
    if (fromGroupIdx !== -1) {
      const fromIndex = newGroups[fromGroupIdx].indexOf(employee);
      if (fromIndex !== -1) {
        newGroups[fromGroupIdx].splice(fromIndex, 1);
      }
      // Xóa group rỗng
      if (newGroups[fromGroupIdx].length === 0) {
        newGroups.splice(fromGroupIdx, 1);
      }
    }
    
    // Thêm vào group mới
    if (toGroupIdx === -1) {
      // Chuyển về unassigned
      setUnassignedEmployees(prev => [...prev, employee]);
    } else {
      if (!newGroups[toGroupIdx]) {
        newGroups[toGroupIdx] = [];
      }
      newGroups[toGroupIdx].push(employee);
    }
    
    setEditableGroups(newGroups);
  };
  
  const addNewGroup = () => {
    setEditableGroups([...editableGroups, []]);
  };
  
  const handleSave = () => {
    // Kiểm tra tất cả nhân viên đã được ghép nhóm
    const allGrouped = editableGroups.flat();
    const missingEmployees = employees.filter(emp => !allGrouped.includes(emp));
    
    if (missingEmployees.length > 0) {
      alert(`⚠️ Còn ${missingEmployees.length} nhân viên chưa được xếp vào nhóm: ${missingEmployees.join(', ')}`);
      return;
    }
    
    onSave(editableGroups);
    onClose();
  };
  
  const resetToAuto = () => {
    const weekNumber = getWeekNumber(new Date());
    const autoGroups = generateAutoPairs(employees, weekNumber);
    setEditableGroups(autoGroups);
    setUnassignedEmployees([]);
  };
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-content">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 z-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">👥 Quản lý nhóm làm việc</h2>
        </div>
        
        <div className="p-4 md:p-6">
          <p className="text-sm text-gray-600 mb-4">
            Mỗi nhóm sẽ làm cùng ca trong ngày. Nhóm 1 và 2 sẽ đảo ca theo luật (Thứ 3: Nhóm1=A, Nhóm2=B; Thứ 4: đảo ngược).
            <br />
            <span className="text-blue-600">💡 Mỗi nhóm có thể có 1, 2, 3 hoặc nhiều nhân viên tùy ý!</span>
          </p>
          
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetToAuto}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-semibold min-h-[44px]"
            >
              🔄 Đặt lại nhóm tự động
            </button>
            <button
              onClick={addNewGroup}
              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-semibold min-h-[44px]"
            >
              + Thêm nhóm mới
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            {editableGroups.map((group, idx) => (
              <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <h3 className="font-semibold text-gray-700">
                    Nhóm {idx + 1} {idx === 0 && <span className="text-xs bg-green-200 px-2 py-0.5 rounded ml-2">(Nhóm chuẩn)</span>}
                    {idx === 1 && <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded ml-2">(Nhóm đảo ca)</span>}
                  </h3>
                  <button
                    onClick={() => {
                      const newGroups = editableGroups.filter((_, i) => i !== idx);
                      setEditableGroups(newGroups);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm min-h-[44px] min-w-[44px]"
                  >
                    🗑️ Xóa nhóm
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map((emp, empIdx) => (
                    <div key={empIdx} className="bg-white rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
                      <span className="font-medium text-sm md:text-base">{emp}</span>
                      <select
                        onChange={(e) => {
                          const targetGroup = parseInt(e.target.value);
                          moveEmployee(emp, idx, targetGroup);
                        }}
                        className="text-xs md:text-sm border rounded px-2 py-1 min-h-[32px]"
                        defaultValue=""
                      >
                        <option value="" disabled>Chuyển đến...</option>
                        {editableGroups.map((_, gIdx) => (
                          gIdx !== idx && <option key={gIdx} value={gIdx}>Nhóm {gIdx + 1}</option>
                        ))}
                        <option value="-1">Chưa xếp nhóm</option>
                      </select>
                    </div>
                  ))}
                  {group.length === 0 && (
                    <p className="text-gray-400 italic text-sm">Chưa có nhân viên</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {unassignedEmployees.length > 0 && (
            <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">📋 Nhân viên chưa xếp nhóm</h3>
              <div className="flex flex-wrap gap-2">
                {unassignedEmployees.map((emp, idx) => (
                  <div key={idx} className="bg-white rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
                    <span className="text-sm md:text-base">{emp}</span>
                    <select
                      onChange={(e) => {
                        const targetGroup = parseInt(e.target.value);
                        moveEmployee(emp, -1, targetGroup);
                      }}
                      className="text-xs md:text-sm border rounded px-2 py-1 min-h-[32px]"
                      defaultValue=""
                    >
                      <option value="" disabled>Chuyển đến nhóm...</option>
                      {editableGroups.map((_, gIdx) => (
                        <option key={gIdx} value={gIdx}>Nhóm {gIdx + 1}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-3 bg-gray-100 rounded-lg">
            <p className="text-xs md:text-sm text-gray-600">
              📌 <strong>Luật đảo ca:</strong>
              <br />
              - Thứ 3: Nhóm 1 = Ca A (9h-20h), Nhóm 2 = Ca B (10h-21h)
              <br />
              - Thứ 4: Nhóm 1 = Ca B, Nhóm 2 = Ca A
              <br />
              - Thứ 5: Nhóm 1 = Ca A, Nhóm 2 = Ca B
              <br />
              - Thứ 6: Nhóm 1 = Ca B, Nhóm 2 = Ca A
              <br />
              - Thứ 7: Nhóm 1 = Ca A, Nhóm 2 = Ca B
              <br />
              - Chủ Nhật: Nhóm 1 = Ca B, Nhóm 2 = Ca A
              <br />
              💡 Nhóm 3,4,... sẽ luân phiên theo thứ tự: Nhóm lẻ (3,5,7) theo Nhóm 1, Nhóm chẵn (4,6,8) theo Nhóm 2
            </p>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-6 py-4">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold min-h-[44px]"
            >
              ❌ Hủy
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold min-h-[44px]"
            >
              💾 Lưu nhóm cho tuần này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== COMPONENT HIỂN THỊ THÔNG TIN ==============
const GroupsInfo = ({ groups, weekNumber, isCustom }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-700 text-base md:text-lg">👥 Phân nhóm làm việc tuần {weekNumber}:</h3>
        {isCustom && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">📝 Đã chỉnh sửa thủ công</span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {groups.map((group, idx) => (
          <div key={idx} className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg px-3 md:px-4 py-2 shadow-sm">
            <span className="font-medium text-sm md:text-base">Nhóm {idx + 1}:</span>{' '}
            <span className="font-semibold text-sm md:text-base">{group.join(', ')}</span>
            <span className="text-xs text-gray-500 ml-2">({group.length} người)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== COMPONENT EMPLOYEE AVATAR ==============
const EmployeeAvatar = ({ name }) => {
  const colors = ['bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-red-200', 'bg-indigo-200', 'bg-teal-200'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const color = colors[Math.abs(hash) % colors.length];
  
  return (
    <div className={`w-10 h-10 md:w-8 md:h-8 rounded-full ${color} flex items-center justify-center font-semibold text-gray-700 text-sm md:text-xs shadow-sm flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// ============== COMPONENT CHÍNH ==============
const App = () => {
  const [employees, setEmployees] = React.useState([]);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = React.useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = React.useState(false);
  const [currentMonday, setCurrentMonday] = React.useState(null);
  const [schedule, setSchedule] = React.useState([]);
  const [currentGroups, setCurrentGroups] = React.useState([]);
  const [isCustomGroups, setIsCustomGroups] = React.useState(false);
  
  // Tải dữ liệu từ localStorage
  React.useEffect(() => {
    const storedEmployees = localStorage.getItem('spa_employees');
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    }
    
    const storedOffset = localStorage.getItem('spa_week_offset');
    if (storedOffset !== null) {
      setWeekOffset(parseInt(storedOffset));
    } else {
      localStorage.setItem('spa_week_offset', '0');
    }
  }, []);
  
  // Lưu employees
  React.useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem('spa_employees', JSON.stringify(employees));
    }
  }, [employees]);
  
  // Cập nhật tuần
  React.useEffect(() => {
    const monday = getMondayFromOffset(weekOffset);
    setCurrentMonday(monday);
    localStorage.setItem('spa_week_offset', weekOffset.toString());
  }, [weekOffset]);
  
  // Cập nhật groups khi employees hoặc tuần thay đổi
  React.useEffect(() => {
    if (employees.length > 0 && currentMonday) {
      const weekKey = getWeekKey(currentMonday);
      const storedGroups = localStorage.getItem(weekKey);
      
      if (storedGroups) {
        // Có groups đã lưu cho tuần này
        setCurrentGroups(JSON.parse(storedGroups));
        setIsCustomGroups(true);
      } else {
        // Tạo groups tự động cho tuần này
        const weekNumber = getWeekNumber(currentMonday);
        const autoGroups = generateAutoPairs(employees, weekNumber);
        setCurrentGroups(autoGroups);
        setIsCustomGroups(false);
      }
    }
  }, [employees, currentMonday]);
  
  // Tạo lịch từ groups
  React.useEffect(() => {
    if (currentMonday && currentGroups.length > 0) {
      const newSchedule = generateScheduleFromGroups(currentGroups, currentMonday);
      setSchedule(newSchedule);
    } else {
      setSchedule([]);
    }
  }, [currentGroups, currentMonday]);
  
  const goPrevWeek = () => {
    setWeekOffset(prev => prev - 1);
  };
  
  const goNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };
  
  const goCurrentWeek = () => {
    setWeekOffset(0);
  };
  
  const saveCustomGroups = (newGroups) => {
    if (currentMonday) {
      const weekKey = getWeekKey(currentMonday);
      localStorage.setItem(weekKey, JSON.stringify(newGroups));
      setCurrentGroups(newGroups);
      setIsCustomGroups(true);
      alert('✅ Đã lưu nhóm cho tuần này!');
    }
  };
  
  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  
  const getWeekRangeText = () => {
    if (!currentMonday) return '';
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    const weekNumber = getWeekNumber(currentMonday);
    return `Tuần ${weekNumber} — ${formatDate(currentMonday)} đến ${formatDate(sunday)}`;
  };
  
  const weekNumber = currentMonday ? getWeekNumber(currentMonday) : 1;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-3 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                🧘‍♀️ Quản lý lịch làm việc Spa
              </h1>
              <p className="text-sm md:text-base text-gray-600">Hệ thống phân ca luân phiên theo nhóm</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsEmployeeModalOpen(true)}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2 shadow-md min-h-[44px]"
              >
                <span>✏️</span>
                Cập nhật nhân viên
              </button>
              {employees.length > 0 && (
                <button
                  onClick={() => setIsGroupsModalOpen(true)}
                  className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition font-semibold flex items-center justify-center gap-2 shadow-md min-h-[44px]"
                >
                  <span>👥</span>
                  Chỉnh sửa nhóm tuần này
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Employee count */}
        {employees.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
              <span className="text-gray-700 font-semibold text-sm md:text-base">👥 Số nhân viên:</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm md:text-base">
                {employees.length}
              </span>
              <div className="flex gap-2 flex-wrap">
                {employees.map((emp, idx) => (
                  <EmployeeAvatar key={idx} name={emp} />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Groups info */}
        {employees.length > 0 && currentGroups.length > 0 && (
          <GroupsInfo groups={currentGroups} weekNumber={weekNumber} isCustom={isCustomGroups} />
        )}
        
        {/* Empty state */}
        {employees.length === 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 md:p-12 text-center mb-4 md:mb-6">
            <div className="text-5xl md:text-6xl mb-4">📋</div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
              Chưa có danh sách nhân viên
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">Vui lòng thêm danh sách nhân viên để tạo lịch làm việc</p>
            <button
              onClick={() => setIsEmployeeModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold inline-flex items-center gap-2 min-h-[44px]"
            >
              <span>➕</span>
              Thêm danh sách nhân viên
            </button>
          </div>
        )}
        
        {/* Schedule controls */}
        {employees.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm md:text-lg font-semibold text-gray-800 text-center sm:text-left">
                  📅 {getWeekRangeText()}
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <button onClick={goPrevWeek} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition font-medium min-h-[44px] text-sm md:text-base">
                    ← Tuần trước
                  </button>
                  <button onClick={goCurrentWeek} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg transition font-medium min-h-[44px] text-sm md:text-base">
                    Tuần hiện tại
                  </button>
                  <button onClick={goNextWeek} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition font-medium min-h-[44px] text-sm md:text-base">
                    Tuần sau →
                  </button>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center items-center text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Ca A: 9:00 – 20:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span>Ca B: 10:00 – 21:00</span>
                </div>
                <div className="text-gray-500 text-center">
                  🔄 Luật đảo ca: Thứ 3 (Nhóm1:A, Nhóm2:B) → Thứ 4 (Nhóm1:B, Nhóm2:A)...
                </div>
              </div>
            </div>
            
            {/* Schedule Table - Desktop */}
            <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                  <tr>
                    {weekDays.map(day => <th key={day} className="p-4 text-center font-semibold text-lg">{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {schedule.map((day, idx) => (
                      <td key={idx} className="border border-gray-200 align-top p-3">
                        {day.dayOfWeek === 1 ? (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-sm font-semibold text-green-800 mb-2">🕘 9:00 – 20:00</div>
                            <div className="text-sm text-gray-700 mb-2 font-medium">Toàn bộ nhân viên:</div>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {day.allEmployees?.map((emp, i) => (
                                <div key={i} className="flex items-center gap-2 p-1">
                                  <EmployeeAvatar name={emp} />
                                  <span className="text-sm">{emp}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                              <div className="text-sm font-semibold text-blue-800 mb-2">🕘 Ca A: 9:00 – 20:00</div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {day.shiftA?.map((emp, i) => (
                                  <div key={i} className="flex items-center gap-2 p-1">
                                    <EmployeeAvatar name={emp} />
                                    <span className="text-sm">{emp}</span>
                                  </div>
                                ))}
                                {(!day.shiftA || day.shiftA.length === 0) && (
                                  <p className="text-xs text-gray-400 italic">Không có nhân viên</p>
                                )}
                              </div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
                              <div className="text-sm font-semibold text-purple-800 mb-2">🕙 Ca B: 10:00 – 21:00</div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {day.shiftB?.map((emp, i) => (
                                  <div key={i} className="flex items-center gap-2 p-1">
                                    <EmployeeAvatar name={emp} />
                                    <span className="text-sm">{emp}</span>
                                  </div>
                                ))}
                                {(!day.shiftB || day.shiftB.length === 0) && (
                                  <p className="text-xs text-gray-400 italic">Không có nhân viên</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Mobile view */}
            <div className="md:hidden space-y-4">
              {schedule.map((day, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg p-4">
                  <div className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                    {weekDays[idx]} • {formatDate(day.date)}
                  </div>
                  
                  {day.dayOfWeek === 1 ? (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="font-semibold text-green-800 mb-2 text-sm">🕘 9:00 – 20:00</div>
                      <div className="space-y-2">
                        {day.allEmployees?.map((emp, i) => (
                          <div key={i} className="flex items-center gap-2 p-1">
                            <EmployeeAvatar name={emp} />
                            <span className="text-sm">{emp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <div className="font-semibold text-blue-800 mb-2 text-sm">🕘 Ca A: 9:00 – 20:00</div>
                        <div className="flex flex-wrap gap-2">
                          {day.shiftA?.map((emp, i) => (
                            <div key={i} className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm">
                              <EmployeeAvatar name={emp} />
                              <span className="text-sm">{emp}</span>
                            </div>
                          ))}
                          {(!day.shiftA || day.shiftA.length === 0) && (
                            <p className="text-xs text-gray-400 italic">Không có nhân viên</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="font-semibold text-purple-800 mb-2 text-sm">🕙 Ca B: 10:00 – 21:00</div>
                        <div className="flex flex-wrap gap-2">
                          {day.shiftB?.map((emp, i) => (
                            <div key={i} className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm">
                              <EmployeeAvatar name={emp} />
                              <span className="text-sm">{emp}</span>
                            </div>
                          ))}
                          {(!day.shiftB || day.shiftB.length === 0) && (
                            <p className="text-xs text-gray-400 italic">Không có nhân viên</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Modals */}
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          onSave={(newEmployees) => {
            setEmployees(newEmployees);
            // Xóa tất cả groups đã lưu khi đổi danh sách nhân viên
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('spa_custom_pairs_')) {
                localStorage.removeItem(key);
              }
            });
          }}
          initialEmployees={employees}
        />
        
        <EditGroupsModal
          isOpen={isGroupsModalOpen}
          onClose={() => setIsGroupsModalOpen(false)}
          groups={currentGroups}
          onSave={saveCustomGroups}
          employees={employees}
        />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));